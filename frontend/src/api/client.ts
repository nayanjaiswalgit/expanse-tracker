import axios, { type AxiosInstance } from 'axios';
import type {
  User,
  Account,
  Category,
  Transaction,
  UnifiedTransaction,
  TransactionSplit,
  Goal,
  MerchantPattern,
  TransactionLink,
  Summary,
  Filter,
  Contact,
  LendingTransaction
} from '../types';

// Additional interfaces for API responses
interface UploadSession {
  id: number;
  filename: string;
  status: string;
  total_transactions: number;
  created_at: string;
  updated_at: string;
}

interface CsvFormat {
  headers: string[];
  sample_data: Record<string, string>[];
  required_fields: string[];
  optional_fields: string[];
}

interface JsonFormat {
  schema: Record<string, unknown>;
  sample_data: Record<string, unknown>;
  required_fields: string[];
  optional_fields: string[];
}

interface Subscription {
  id: number;
  name: string;
  amount: string;
  billing_cycle: 'monthly' | 'yearly' | 'weekly' | 'daily';
  next_billing_date: string;
  status: 'active' | 'paused' | 'cancelled';
  category_id?: string;
  account_id: number;
  created_at: string;
  updated_at: string;
}

interface ProcessingRule {
  id: number;
  name: string;
  description?: string;
  conditions: ProcessingRuleCondition[];
  actions: ProcessingRuleAction[];
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface ProcessingRuleCondition {
  field: string;
  operator: string;
  value: string;
}

interface ProcessingRuleAction {
  field: string;
  value: string;
}

interface GmailAccount {
  id: number;
  email: string;
  is_active: boolean;
  last_sync: string;
  sync_status: 'idle' | 'syncing' | 'error';
  total_emails_processed: number;
  created_at: string;
  updated_at: string;
}

interface EmailTemplate {
  id: number;
  name: string;
  subject_pattern: string;
  body_pattern: string;
  sender_pattern?: string;
  category_id?: string;
  confidence_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ExtractedTransaction {
  id: number;
  gmail_message_id: string;
  merchant_name?: string;
  amount?: string;
  date?: string;
  description?: string;
  category_id?: string;
  confidence_score: number;
  status: 'pending' | 'approved' | 'rejected';
  raw_data: Record<string, unknown>;
  created_at: string;
}

interface TransactionSuggestion {
  id: number;
  transaction_id: number;
  suggested_category_id?: string;
  suggested_merchant?: string;
  confidence_score: number;
  reason: string;
}


interface SubscriptionSummary {
  total_active: number;
  total_monthly_cost: string;
  total_yearly_cost: string;
  upcoming_renewals: number;
  paused_subscriptions: number;
}

interface LendingSummary {
  total_lent: string;
  total_borrowed: string;
  total_outstanding_lent: string;
  total_outstanding_borrowed: string;
  overdue_count: number;
}


interface GmailSyncStatus {
  account_id: number;
  account_email: string;
  status: 'idle' | 'syncing' | 'completed' | 'error';
  last_sync: string;
  emails_processed: number;
  transactions_extracted: number;
  error_message?: string;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface CurrencyResponse {
  currencies: Currency[];
  count: number;
}

interface ExchangeRateResponse {
  base_currency: string;
  rates: Record<string, number>;
}

interface CurrencyConversionResponse {
  from_currency: string;
  to_currency: string;
  original_amount: number;
  converted_amount: number;
  exchange_rate: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Request interceptor to add CSRF protection
    // No need to add Authorization header as httpOnly cookies are sent automatically
    this.client.interceptors.request.use((config) => {
      // Add CSRF token for state-changing operations
      if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
        const csrfToken = this.getCSRFToken();
        if (csrfToken) {
          config.headers['X-CSRFToken'] = csrfToken;
        }
      }
      
      return config;
    });

    // Response interceptor to handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // Don't try to refresh if it's the refresh endpoint itself
          if (originalRequest.url?.includes('/auth/refresh/')) {
            this.clearTokens();
            window.dispatchEvent(new CustomEvent('auth-token-expired'));
            return Promise.reject(error);
          }
          
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            this.refreshPromise = this.performTokenRefresh().finally(() => {
              this.isRefreshing = false;
              this.refreshPromise = null;
            });
          }
          
          try {
            await this.refreshPromise;
            return this.client(originalRequest);
          } catch {
            this.clearTokens();
            window.dispatchEvent(new CustomEvent('auth-token-expired'));
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      }
    );
  }


  private getRefreshToken(): string | null {
    // For httpOnly cookies, we can't access them via JavaScript
    // The browser will automatically send them with requests  
    return null;
  }

  private getCSRFToken(): string | null {
    // Get CSRF token from cookie or meta tag
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];
    
    if (cookieValue) return cookieValue;
    
    // Fallback to meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
    return metaTag?.content || null;
  }

  private setTokens(): void {
    // Tokens are stored as httpOnly cookies by the server
    // We don't store them in localStorage for security reasons
    // The browser automatically sends httpOnly cookies with requests
  }

  private clearTokens(): void {
    // httpOnly cookies will be cleared by the server during logout
    // Just clear localStorage user data
    localStorage.removeItem('user');
  }

  // Authentication
  async login(email: string, password: string): Promise<{ user: User; access?: string; refresh?: string }> {
    const response = await this.client.post('/auth/login/', { email, password });
    const { user, access, refresh } = response.data;
    
    // Backend may or may not include tokens in response body depending on configuration
    if (access && refresh) {
      this.setTokens();
    }
    // Tokens are now stored as httpOnly cookies by the server regardless
    
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  }

  async register(email: string, password: string, full_name: string): Promise<{ user: User; access?: string; refresh?: string }> {
    const response = await this.client.post('/auth/register/', {
      email,
      password,
      password_confirm: password,
      full_name,
    });
    const { user, access, refresh } = response.data;
    
    // Backend may or may not include tokens in response body depending on configuration
    if (access && refresh) {
      this.setTokens();
    }
    // Tokens are now stored as httpOnly cookies by the server regardless
    
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  }

  async getGoogleAuthUrl(): Promise<{ auth_url: string }> {
    const response = await this.client.get('/auth/google_auth_url/');
    return response.data;
  }

  async googleLogin(code: string, state: string): Promise<{ user: User; access: string; refresh: string; created: boolean }> {
    const response = await this.client.post('/auth/google_login/', { code, state });
    const { user } = response.data;
    this.setTokens();
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  }

  async refreshToken(): Promise<void> {
    // Prevent multiple concurrent refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }
    
    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<void> {
    try {
      // Use a separate axios instance with cookies for refresh
      const refreshClient = axios.create({
        baseURL: API_BASE_URL,
        withCredentials: true,
        timeout: 10000,
      });

      // The refresh endpoint will use the httpOnly refresh_token cookie
      const response = await refreshClient.post('/auth/refresh/');

      // New tokens are automatically set as httpOnly cookies by the server
      // Update user data in localStorage if provided
      const { user } = response.data;
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
    } catch (error) {
      // Clear user data if refresh fails
      this.clearTokens();
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        await this.client.post('/auth/logout/', { refresh: refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }

  // Users
  async getCurrentUser(): Promise<User> {
    const response = await this.client.get('/users/me/');
    return response.data;
  }

  async searchUsers(query: string): Promise<User[]> {
    const response = await this.client.get(`/users/search/?q=${encodeURIComponent(query)}`);
    return response.data;
  }

  async updateUserPreferences(preferences: {
    default_currency?: string;
    preferred_currency?: string;
    preferred_date_format?: string;
    timezone?: string;
    language?: string;
    theme?: string;
    notifications_enabled?: boolean;
    enable_notifications?: boolean;
    email_notifications?: boolean;
    push_notifications?: boolean;
    full_name?: string;
    email?: string;
    phone?: string;
    bio?: string;
    website?: string;
    location?: string;
  } | FormData): Promise<User> {
    const headers = preferences instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};

    // If it's not FormData, transform the data to match backend expectations
    if (!(preferences instanceof FormData)) {
      const transformedData = { ...preferences };

      // Map notifications_enabled to enable_notifications for backward compatibility
      if (transformedData.notifications_enabled !== undefined) {
        transformedData.enable_notifications = transformedData.notifications_enabled;
      }

      const response = await this.client.patch('/users/update_preferences/', transformedData, { headers });
      return response.data;
    }

    const response = await this.client.patch('/users/update_preferences/', preferences, { headers });
    return response.data;
  }

  // Accounts
  async getAccounts(): Promise<Account[]> {
    const response = await this.client.get('/accounts/');
    return response.data.results || response.data;
  }

  async createAccount(account: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Account> {
      const response = await this.client.post('/accounts/', account);
      return response.data;
  }

  async updateAccount(id: number, account: Partial<Account>): Promise<Account> {
    const response = await this.client.patch(`/accounts/${id}/`, account);
    return response.data;
  }

  async deleteAccount(id: number): Promise<void> {
    await this.client.delete(`/accounts/${id}/`);
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const response = await this.client.get('/categories/');
    return response.data.results || response.data;
  }

  async createCategory(category: Omit<Category, 'id' | 'user_id' | 'created_at'>): Promise<Category> {
    const response = await this.client.post('/categories/', category);
    return response.data;
  }

  async updateCategory(id: number, category: Partial<Category>): Promise<Category> {
    const response = await this.client.patch(`/categories/${id}/`, category);
    return response.data;
  }

  async deleteCategory(id: number): Promise<void> {
    await this.client.delete(`/categories/${id}/`);
  }

  // Goals
  async getGoals(): Promise<Goal[]> {
    const response = await this.client.get('/goals/');
    return response.data.results || response.data;
  }

  async createGoal(goal: Omit<Goal, 'id' | 'progress_percentage' | 'remaining_amount' | 'is_completed' | 'created_at' | 'updated_at'>): Promise<Goal> {
    const response = await this.client.post('/goals/', goal);
    return response.data;
  }

  async updateGoal(id: number, goal: Partial<Goal>): Promise<Goal> {
    const response = await this.client.patch(`/goals/${id}/`, goal);
    return response.data;
  }

  async deleteGoal(id: number): Promise<void> {
    await this.client.delete(`/goals/${id}/`);
  }

  async updateGoalProgress(id: number, amount: number): Promise<Goal> {
    const response = await this.client.post(`/goals/${id}/update_progress/`, { amount });
    return response.data;
  }

  async toggleGoalStatus(id: number, status: 'active' | 'paused' | 'cancelled'): Promise<Goal> {
    const response = await this.client.post(`/goals/${id}/toggle_status/`, { status });
    return response.data;
  }

  // Merchant Patterns
  async getMerchantPatterns(): Promise<MerchantPattern[]> {
    const response = await this.client.get('/merchant-patterns/');
    return response.data.results || response.data;
  }

  async createMerchantPattern(pattern: Omit<MerchantPattern, 'id' | 'created_at' | 'last_used' | 'usage_count' | 'category_name'>): Promise<MerchantPattern> {
    const response = await this.client.post('/merchant-patterns/', pattern);
    return response.data;
  }

  async updateMerchantPattern(id: number, pattern: Partial<MerchantPattern>): Promise<MerchantPattern> {
    const response = await this.client.patch(`/merchant-patterns/${id}/`, pattern);
    return response.data;
  }

  async deleteMerchantPattern(id: number): Promise<void> {
    await this.client.delete(`/merchant-patterns/${id}/`);
  }

  // Transaction Links
  async getTransactionLinks(): Promise<TransactionLink[]> {
    const response = await this.client.get('/transaction-links/');
    return response.data.results || response.data;
  }

  async confirmTransactionLink(id: number): Promise<TransactionLink> {
    const response = await this.client.post(`/transaction-links/${id}/confirm/`);
    return response.data;
  }

  // Transactions
  async getTransactions(filters?: Partial<Filter>): Promise<{ results: Transaction[]; count: number }> {
    const { buildUrlParams } = await import('./utils');
    const params = filters ? buildUrlParams(filters) : new URLSearchParams();

    const response = await this.client.get(`/transactions/?${params.toString()}`);
    return response.data;
  }

  async getTransaction(id: number): Promise<Transaction> {
    const response = await this.client.get(`/transactions/${id}/`);
    return response.data;
  }

  async createTransaction(transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Transaction> {
    const response = await this.client.post('/transactions/', transaction);
    return response.data;
  }

  async updateTransaction(id: number, transaction: Partial<Transaction>): Promise<Transaction> {
    const response = await this.client.patch(`/transactions/${id}/`, transaction);
    return response.data;
  }

  async deleteTransaction(id: number): Promise<void> {
    await this.client.delete(`/transactions/${id}/`);
  }

  async updateTransactionSplits(id: number, splits: TransactionSplit[]): Promise<Transaction> {
    const response = await this.client.post(`/transactions/${id}/split/`, { splits });
    return response.data;
  }

  async bulkUpdateTransactionAccount(transactionIds: number[], accountId: number): Promise<{ updated_count: number; account_name: string }> {
    const response = await this.client.post('/transactions/bulk_update_account/', {
      transaction_ids: transactionIds,
      account_id: accountId
    });
    return response.data;
  }

  async bulkUpdateTransactions(transactionIds: number[], updates: {
    accountId?: number;
    categoryId?: string;
    tags?: string[];
    verified?: boolean;
  }): Promise<{ updated_count: number }> {
    const data: Record<string, unknown> = { transaction_ids: transactionIds };
    
    if (updates.accountId !== undefined) data.account_id = updates.accountId;
    if (updates.categoryId !== undefined) data.category_id = updates.categoryId;
    if (updates.tags !== undefined) data.tags = updates.tags;
    if (updates.verified !== undefined) data.verified = updates.verified;

    const response = await this.client.post('/transactions/bulk_update/', data);
    return response.data;
  }

  async suggestTransactionLinks(id: number): Promise<{ suggestions: TransactionSuggestion[] }> {
    const response = await this.client.get(`/transactions/${id}/suggest_links/`);
    return response.data;
  }

  async autoCategorizTransaction(id: number): Promise<Transaction> {
    const response = await this.client.post(`/transactions/${id}/auto_categorize/`);
    return response.data;
  }

  async acceptSuggestedCategory(id: number): Promise<Transaction> {
    const response = await this.client.post(`/transactions/${id}/accept_suggestion/`);
    return response.data;
  }

  async getTransactionSummary(filters?: Partial<Filter>): Promise<Summary> {
    const { buildUrlParams } = await import('./utils');
    const params = filters ? buildUrlParams(filters) : new URLSearchParams();

    const response = await this.client.get(`/transactions/summary/?${params.toString()}`);
    return response.data;
  }

  // Recurring Transactions
  async getRecurringTransactions(): Promise<Transaction[]> {
    const response = await this.client.get('/transactions/recurring/');
    return response.data.results || response.data;
  }

  async makeTransactionRecurring(id: number, frequency: string, next_occurrence?: string, end_date?: string): Promise<Transaction> {
    const response = await this.client.post(`/transactions/${id}/make_recurring/`, {
      frequency,
      next_occurrence,
      end_date
    });
    return response.data;
  }

  async stopRecurringTransaction(id: number): Promise<Transaction> {
    const response = await this.client.post(`/transactions/${id}/stop_recurring/`);
    return response.data;
  }

  // Upload
  async uploadFile(file: File, password?: string, accountId?: number): Promise<{ session_id: number; status: string; total_transactions: number }> {
    const formData = new FormData();
    formData.append('file', file);
    if (password) {
      formData.append('password', password);
    }
    if (accountId) {
      formData.append('account_id', accountId.toString());
    }
    
    const response = await this.client.post('/upload/upload_statement/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  async getCsvFormat(): Promise<CsvFormat> {
    const response = await this.client.get('/upload/csv_format/');
    return response.data;
  }

  async getJsonFormat(): Promise<JsonFormat> {
    const response = await this.client.get('/upload/json_format/');
    return response.data;
  }

  async getUploadSessions(): Promise<UploadSession[]> {
    const response = await this.client.get('/upload/sessions/');
    return response.data.sessions || [];
  }

  async getUploadStatus(sessionId: number): Promise<UploadSession> {
    const response = await this.client.get(`/upload/${sessionId}/status/`);
    return response.data;
  }

  async updateUploadSession(sessionId: number, data: { filename?: string }): Promise<UploadSession> {
    const response = await this.client.patch(`/upload/${sessionId}/`, data);
    return response.data;
  }

  async deleteUploadSession(sessionId: number): Promise<void> {
    await this.client.delete(`/upload/${sessionId}/`);
  }

  // OCR Receipt Processing
  async processReceipt(receiptImage: File, accountId?: number): Promise<{
    success: boolean;
    ocr_result: {
      merchant_name?: string;
      amount?: string;
      date?: string;
      items: string[];
      suggested_category?: string;
      confidence: number;
      ai_analysis?: string;
      raw_text: string;
    };
    suggestions: {
      create_transaction: boolean;
      account_id?: number;
      account_name?: string;
    };
  }> {
    const formData = new FormData();
    formData.append('receipt_image', receiptImage);
    if (accountId) {
      formData.append('account_id', accountId.toString());
    }

    const response = await this.client.post('/upload/process_receipt/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async createTransactionFromReceipt(data: {
    merchant_name: string;
    amount: number | string;
    date: string;
    account_id: number;
    category_name?: string;
    items?: string[];
    notes?: string;
  }): Promise<{
    success: boolean;
    transaction_id: number;
    message: string;
  }> {
    const response = await this.client.post('/upload/create_transaction_from_receipt/', data);
    return response.data;
  }

  // Contacts API
  async getContacts(): Promise<Contact[]> {
    const response = await this.client.get('/contacts/');
    return response.data.results || response.data;
  }

  async createContact(data: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact> {
    const response = await this.client.post('/contacts/', data);
    return response.data;
  }

  async updateContact(id: number, data: Partial<Contact>): Promise<Contact> {
    const response = await this.client.patch(`/contacts/${id}/`, data);
    return response.data;
  }

  async deleteContact(id: number): Promise<void> {
    await this.client.delete(`/contacts/${id}/`);
  }

  // ExpenseGroups API (New Splitwise-like structure)
  async getExpenseGroups(): Promise<any[]> {
    const response = await this.client.get('/expense-groups/');
    return response.data.results || response.data;
  }

  async createExpenseGroup(data: { name: string; description?: string; group_type?: string }): Promise<any> {
    const response = await this.client.post('/expense-groups/', data);
    return response.data;
  }

  async updateExpenseGroup(id: number, data: Partial<{ name: string; description: string; group_type: string }>): Promise<any> {
    const response = await this.client.patch(`/expense-groups/${id}/`, data);
    return response.data;
  }

  async deleteExpenseGroup(id: number): Promise<void> {
    await this.client.delete(`/expense-groups/${id}/`);
  }

  async getExpenseGroupMembers(groupId: number): Promise<any[]> {
    const response = await this.client.get(`/expense-groups/${groupId}/members/`);
    return response.data;
  }

  async addExpenseGroupMember(groupId: number, userIdOrEmail: number | string, role?: string): Promise<any> {
    const data: any = {
      role: role || 'member'
    };

    if (typeof userIdOrEmail === 'number') {
      data.user_id = userIdOrEmail;
    } else {
      data.email = userIdOrEmail;
    }

    const response = await this.client.post(`/expense-groups/${groupId}/add_member/`, data);
    return response.data;
  }

  async removeExpenseGroupMember(groupId: number, userId: number): Promise<void> {
    await this.client.delete(`/expense-groups/${groupId}/remove_member/`, {
      data: { user_id: userId }
    });
  }

  async getExpenseGroupBalances(groupId: number): Promise<any[]> {
    const response = await this.client.get(`/expense-groups/${groupId}/balances/`);
    return response.data;
  }

  async getUserOverallBalances(): Promise<any> {
    const response = await this.client.get('/balances/');
    return response.data;
  }

  // Group Expenses within ExpenseGroups
  async getGroupExpensesForGroup(groupId: number): Promise<any[]> {
    const response = await this.client.get(`/expense-groups/${groupId}/expenses/`);
    return response.data.results || response.data;
  }

  async createGroupExpenseInGroup(groupId: number, data: {
    title: string;
    description?: string;
    total_amount: string;
    date: string;
    split_method?: string;
    shares_data?: any[];
  }): Promise<any> {
    const response = await this.client.post(`/expense-groups/${groupId}/expenses/`, data);
    return response.data;
  }

  async updateGroupExpenseInGroup(groupId: number, expenseId: number, data: any): Promise<any> {
    const response = await this.client.patch(`/expense-groups/${groupId}/expenses/${expenseId}/`, data);
    return response.data;
  }

  async deleteGroupExpenseInGroup(groupId: number, expenseId: number): Promise<void> {
    await this.client.delete(`/expense-groups/${groupId}/expenses/${expenseId}/`);
  }

  async settleGroupExpense(groupId: number, expenseId: number): Promise<any> {
    const response = await this.client.post(`/expense-groups/${groupId}/expenses/${expenseId}/settle/`);
    return response.data;
  }

  async getGroupExpenseSettlementStatus(groupId: number, expenseId: number): Promise<any> {
    const response = await this.client.get(`/expense-groups/${groupId}/expenses/${expenseId}/settlement_status/`);
    return response.data;
  }

  async getGroupExpensesSummary(groupId: number): Promise<any> {
    const response = await this.client.get(`/expense-groups/${groupId}/expenses/summary/`);
    return response.data;
  }



  // Unified Transaction API for Lending and Group Expenses
  async getLendingTransactions(contactId?: number): Promise<UnifiedTransaction[]> {
    const params = new URLSearchParams();
    if (contactId) params.append('contact_id', contactId.toString());

    const response = await this.client.get(`/transactions/lending/?${params.toString()}`);
    return response.data.results || response.data;
  }

  async createLendingTransaction(data: {
    contact_user: number;
    account: number;
    transaction_type: 'lend' | 'borrow';
    amount: string;
    description: string;
    date: string;
    due_date?: string;
    interest_rate?: string;
    notes?: string;
  }): Promise<UnifiedTransaction> {
    const response = await this.client.post('/transactions/create_lending/', data);
    return response.data;
  }

  async recordLendingRepayment(lendingId: number, amount: string, date?: string, notes?: string): Promise<UnifiedTransaction> {
    const response = await this.client.post(`/transactions/${lendingId}/record_repayment/`, {
      amount: amount,
      date: date,
      notes: notes
    });
    return response.data;
  }

  async getLendingSummary(): Promise<LendingSummary> {
    const response = await this.client.get('/transactions/lending_summary/');
    return response.data;
  }

  async getGroupExpenseTransactions(groupId?: number): Promise<UnifiedTransaction[]> {
    const params = new URLSearchParams();
    if (groupId) params.append('group_id', groupId.toString());

    const response = await this.client.get(`/transactions/group_expenses/?${params.toString()}`);
    return response.data.results || response.data;
  }

  // OCR Invoice Processing
  async processInvoice(file: File): Promise<{
    raw_text: string;
    merchant_name?: string;
    amount?: number;
    date?: string;
    items?: string[];
    confidence?: number;
    suggested_category?: string;
    error?: string;
  }> {
    const formData = new FormData();
    formData.append('invoice', file);
    
    const response = await this.client.post('/transactions/process_receipt/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  // Export transactions
  async exportTransactions(
    format: 'csv' | 'json' | 'excel' | 'pdf',
    transactionIds?: number[],
    filters?: Partial<Filter>
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    
    if (transactionIds && transactionIds.length > 0) {
      params.append('transaction_ids', transactionIds.join(','));
    }
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    const response = await this.client.get(`/transactions/export/?${params.toString()}`, {
      responseType: 'blob',
    });
    
    return response.data;
  }

  // Subscriptions
  async getSubscriptions(): Promise<Subscription[]> {
    const response = await this.client.get('/subscriptions/');
    return response.data.results || response.data;
  }

  async createSubscription(subscription: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>): Promise<Subscription> {
    const response = await this.client.post('/subscriptions/', subscription);
    return response.data;
  }

  async updateSubscription(id: number, subscription: Partial<Subscription>): Promise<Subscription> {
    const response = await this.client.patch(`/subscriptions/${id}/`, subscription);
    return response.data;
  }

  async deleteSubscription(id: number): Promise<void> {
    await this.client.delete(`/subscriptions/${id}/`);
  }

  async detectSubscriptions(lookbackDays: number = 365): Promise<{ detected_subscriptions: Partial<Subscription>[]; count: number }> {
    const response = await this.client.post('/subscriptions/detect_subscriptions/', {
      lookback_days: lookbackDays
    });
    return response.data;
  }

  async createSubscriptionFromDetection(detectionData: Partial<Subscription>): Promise<Subscription> {
    const response = await this.client.post('/subscriptions/create_from_detection/', {
      detection_data: detectionData
    });
    return response.data;
  }

  async getSubscriptionSummary(): Promise<SubscriptionSummary> {
    const response = await this.client.get('/subscriptions/summary/');
    return response.data;
  }

  async getUpcomingRenewals(days: number = 7): Promise<Subscription[]> {
    const response = await this.client.get(`/subscriptions/upcoming_renewals/?days=${days}`);
    return response.data;
  }

  async getMissedPayments(graceDays: number = 5): Promise<Subscription[]> {
    const response = await this.client.get(`/subscriptions/missed_payments/?grace_days=${graceDays}`);
    return response.data;
  }

  async pauseSubscription(id: number): Promise<Subscription> {
    const response = await this.client.post(`/subscriptions/${id}/pause/`);
    return response.data;
  }

  async resumeSubscription(id: number): Promise<Subscription> {
    const response = await this.client.post(`/subscriptions/${id}/resume/`);
    return response.data;
  }

  async cancelSubscription(id: number): Promise<Subscription> {
    const response = await this.client.post(`/subscriptions/${id}/cancel/`);
    return response.data;
  }

  // Processing Rules
  async getProcessingRules(): Promise<ProcessingRule[]> {
    const response = await this.client.get('/processing-rules/');
    return response.data.results || response.data;
  }

  async createProcessingRule(rule: Omit<ProcessingRule, 'id' | 'created_at' | 'updated_at'>): Promise<ProcessingRule> {
    const response = await this.client.post('/processing-rules/', rule);
    return response.data;
  }

  async updateProcessingRule(id: number, rule: Partial<ProcessingRule>): Promise<ProcessingRule> {
    const response = await this.client.patch(`/processing-rules/${id}/`, rule);
    return response.data;
  }

  async deleteProcessingRule(id: number): Promise<void> {
    await this.client.delete(`/processing-rules/${id}/`);
  }

  async getProcessingRuleChoices(): Promise<{ field_choices: Record<string, string[]>; operator_choices: Record<string, string[]> }> {
    const response = await this.client.get('/processing-rules/choices/');
    return response.data;
  }

  async testProcessingRule(id: number): Promise<{ matched_transactions: Transaction[]; match_count: number }> {
    const response = await this.client.post(`/processing-rules/${id}/test_rule/`);
    return response.data;
  }

  async applyProcessingRuleToExisting(id: number): Promise<{ updated_count: number; affected_transactions: number[] }> {
    const response = await this.client.post(`/processing-rules/${id}/apply_to_existing/`);
    return response.data;
  }

  async reorderProcessingRules(ruleIds: number[]): Promise<{ success: boolean; updated_rules: ProcessingRule[] }> {
    const response = await this.client.post('/processing-rules/reorder/', { rule_ids: ruleIds });
    return response.data;
  }

  // Gmail Integration (Updated for new structure)
  async getGmailAccount(): Promise<any> {
    const response = await this.client.get('/integrations/gmail-account/');
    return response.data;
  }

  async connectGmail(): Promise<{ authorization_url: string; state: string }> {
    const response = await this.client.get('/integrations/gmail-connect/');
    return response.data;
  }

  async disconnectGmail(): Promise<{ message: string }> {
    const response = await this.client.delete('/integrations/gmail-account/');
    return response.data;
  }

  async updateGmailSettings(data: { email_filter_keywords?: string[]; email_filter_senders?: string[] }): Promise<any> {
    const response = await this.client.patch('/integrations/gmail-account/', data);
    return response.data;
  }

  async testGmailFetch(): Promise<{ message: string; task_id: string }> {
    const response = await this.client.post('/integrations/gmail-test-fetch/');
    return response.data;
  }


  // Email Templates
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    const response = await this.client.get('/email-templates/');
    return response.data.results || response.data;
  }

  async createEmailTemplate(template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<EmailTemplate> {
    const response = await this.client.post('/email-templates/', template);
    return response.data;
  }

  async updateEmailTemplate(id: number, template: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const response = await this.client.patch(`/email-templates/${id}/`, template);
    return response.data;
  }

  async deleteEmailTemplate(id: number): Promise<void> {
    await this.client.delete(`/email-templates/${id}/`);
  }

  async getCommonEmailPatterns(): Promise<{ patterns: Partial<EmailTemplate>[]; categories: string[] }> {
    const response = await this.client.get('/email-templates/common_patterns/');
    return response.data;
  }

  // Extracted Transactions
  async getExtractedTransactions(params?: Record<string, unknown>): Promise<ExtractedTransaction[]> {
    const response = await this.client.get('/extracted-transactions/', { params });
    return response.data.results || response.data;
  }

  async getExtractedTransactionsSummary(): Promise<{ pending_count: number; approved_count: number; rejected_count: number; total_amount: string }> {
    const response = await this.client.get('/extracted-transactions/summary/');
    return response.data;
  }

  async performTransactionActions(action: string, data: Record<string, unknown>): Promise<{ success: boolean; message: string; affected_count?: number }> {
    const response = await this.client.post('/extracted-transactions/actions/', {
      action,
      ...data
    });
    return response.data;
  }

  async approveExtractedTransaction(id: number, data?: Record<string, unknown>): Promise<{ success: boolean; transaction_id?: number; message: string }> {
    const response = await this.client.post(`/extracted-transactions/${id}/approve/`, data || {});
    return response.data;
  }

  async rejectExtractedTransaction(id: number, data?: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post(`/extracted-transactions/${id}/reject/`, data || {});
    return response.data;
  }

  // Gmail Sync Operations
  async startGmailSync(data?: { account_ids?: number[]; force_full_sync?: boolean }): Promise<{ status: string; message: string; sync_id?: string }> {
    const response = await this.client.post('/gmail-sync/start/', data || {});
    return response.data;
  }

  async getGmailSyncStatus(): Promise<GmailSyncStatus[]> {
    const response = await this.client.get('/gmail-sync/status/');
    return response.data;
  }

  // Currency API
  async getSupportedCurrencies(): Promise<CurrencyResponse> {
    const response = await this.client.get('/integrations/currencies/');
    return response.data;
  }

  async getExchangeRates(baseCurrency = 'USD'): Promise<ExchangeRateResponse> {
    const response = await this.client.get(`/integrations/currencies/exchange-rates/?base=${baseCurrency}`);
    return response.data;
  }

  async convertCurrency(fromCurrency: string, toCurrency: string, amount: number): Promise<CurrencyConversionResponse> {
    const response = await this.client.post('/integrations/currencies/convert/', {
      from_currency: fromCurrency,
      to_currency: toCurrency,
      amount
    });
    return response.data;
  }

  // Generic HTTP methods for direct API access
  async get(url: string, config?: Record<string, unknown>): Promise<unknown> {
    const response = await this.client.get(url, config);
    return response;
  }

  async post(url: string, data?: unknown, config?: Record<string, unknown>): Promise<unknown> {
    const response = await this.client.post(url, data, config);
    return response;
  }

  async patch(url: string, data?: unknown, config?: Record<string, unknown>): Promise<unknown> {
    const response = await this.client.patch(url, data, config);
    return response;
  }

  async delete(url: string, config?: Record<string, unknown>): Promise<unknown> {
    const response = await this.client.delete(url, config);
    return response;
  }

  // Data Import/Export/User Management
  async importTransactions(formData: FormData, importType: string): Promise<{ success: boolean; imported_count: number; errors?: string[]; session_id?: number }> {
    const response = await this.client.post(`/transactions/import/?format=${importType}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteUserAccount(): Promise<void> {
    await this.client.delete('/auth/user/');
  }

  async changePassword(data: { current_password: string; new_password: string }): Promise<void> {
    await this.client.post('/auth/change-password/', data);
  }
}

export const apiClient = new ApiClient();

export type { Currency, CurrencyResponse, ExchangeRateResponse, CurrencyConversionResponse };