export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  preferred_currency: string;
  preferred_date_format: string;
  enable_notifications: boolean;
  profile_picture?: string;
  profile_photo_url?: string;
  profile_photo_thumbnail_url?: string;
  has_custom_photo?: boolean;
  ai_credits_remaining?: number;
  current_plan?: string;
  subscription_status?: string;
  created_at: string;
  // Additional profile fields
  phone?: string;
  bio?: string;
  website?: string;
  location?: string;
  default_currency?: string;
  timezone?: string;
  language?: string;
  theme?: string;
  notifications_enabled?: boolean;
  email_notifications?: boolean;
  push_notifications?: boolean;
}

export interface Account {
  id: number;
  // Basic Information
  name: string;
  description?: string;
  account_type: 'checking' | 'savings' | 'credit' | 'investment' | 'loan' | 'cash' | 'other';
  status: 'active' | 'inactive' | 'closed' | 'frozen' | 'pending';
  priority: 'low' | 'medium' | 'high' | 'critical';

  // Financial Information
  balance: string;
  available_balance: string;
  currency: string;
  credit_limit?: string;
  minimum_balance: string;
  balance_status?: 'below_minimum' | 'over_limit' | 'zero_or_negative' | 'normal';

  // Institution Information
  institution?: string;
  institution_code?: string;
  account_number?: string;
  account_number_masked?: string;

  // Account Settings
  is_active: boolean;
  is_primary: boolean;
  include_in_budget: boolean;
  track_balance: boolean;

  // Dates
  opened_date?: string;
  closed_date?: string;
  last_sync_date?: string;
  days_since_opened?: number;

  // Additional Information
  interest_rate?: string;
  tags: string[];
  metadata: Record<string, any>;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface BalanceRecord {
  id: number;
  account: number;
  account_name: string;
  account_type: string;

  // Core Information
  balance: string;
  date: string;
  entry_type: 'daily' | 'monthly' | 'weekly' | 'manual' | 'reconciliation';
  entry_type_display: string;

  // Statement/Reconciliation Fields
  statement_balance?: string;
  reconciliation_status: 'pending' | 'reconciled' | 'discrepancy' | 'investigation';
  reconciliation_status_display: string;
  difference: string;

  // Transaction Analysis
  total_income: string;
  total_expenses: string;
  calculated_change: string;
  actual_change: string;
  missing_transactions: string;

  // Period Information
  period_start?: string;
  period_end?: string;
  is_month_end: boolean;
  year?: number;
  month?: number;
  month_name: string;
  date_display: string;

  // Additional Information
  notes?: string;
  source?: string;
  confidence_score?: string;
  metadata: Record<string, any>;

  // Computed fields
  has_discrepancy: boolean;
  balance_status: string;

  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: number;
  name: string;
  color: string;
  is_system: boolean;
  created_at: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  account_id: number;
  category_id?: string;
  amount: string;
  description: string;
  date: string;
  transaction_type: 'income' | 'expense' | 'transfer' | 'buy' | 'sell' | 'dividend' | 'lend' | 'borrow' | 'repayment';
  verified: boolean;
  tags: string[];
  notes?: string;
  balance_after?: string;
  merchant_name?: string;
  location?: string;
  suggested_category?: string;
  confidence_score?: number;
  splits?: TransactionSplit[];
  created_at: string;
  updated_at: string;
}

export interface TransactionSplit {
  id?: number;
  category_id: string;
  amount: string;
  description?: string;
}

export interface Goal {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  goal_type?: 'savings' | 'spending' | 'debt_payoff' | 'investment';
  target_amount: string;
  current_amount: string;
  target_date?: string;
  start_date?: string;
  currency?: string;
  color?: string;
  thumbnail_image?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  progress_percentage: number;
  remaining_amount: string;
  is_completed: boolean;
  images?: GoalImage[];
  created_at: string;
  updated_at: string;
}

export interface GoalImage {
  id: number;
  goal_id: number;
  image_url: string;
  thumbnail_url?: string;
  caption?: string;
  is_primary: boolean;
  created_at: string;
}

export interface MerchantPattern {
  id: number;
  user_id: number;
  pattern: string;
  category_id: string;
  category_name: string;
  merchant_name: string;
  confidence: number;
  is_active: boolean;
  created_at: string;
  last_used?: string;
  usage_count: number;
}

export interface TransactionLink {
  id: number;
  from_transaction_id: number;
  to_transaction_id: number;
  link_type: 'transfer' | 'refund' | 'split_payment' | 'correction';
  confidence_score: number;
  is_confirmed: boolean;
  created_at: string;
}

export interface Summary {
  total_income: string;
  total_expenses: string;
  net_amount: string;
  transaction_count: number;
  account_balances: {
    account_name: string;
    balance: string;
    currency: string;
  }[];
  category_breakdown: {
    category_name: string;
    amount: string;
    percentage: number;
    transaction_count: number;
  }[];
  monthly_trend: {
    month: string;
    income: string;
    expenses: string;
    net: string;
  }[];
}

export interface Filter {
  search?: string;
  account_ids?: number[];
  category_ids?: string[];
  start_date?: string;
  end_date?: string;
  min_amount?: string;
  max_amount?: string;
  transaction_type?: 'income' | 'expense' | 'transfer' | 'buy' | 'sell' | 'dividend' | 'lend' | 'borrow' | 'repayment';
  verified?: boolean;
  tags?: string[];
  page?: number;
  page_size?: number;
  ordering?: string;
  accounts?: number[];
  categories?: string[];
  upload_session?: number;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
}

export interface Contact {
  id: number;
  user_id: number;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface GroupExpense {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  total_amount: string;
  account_id: number;
  account_name: string;
  paid_by: number;
  paid_by_name: string;
  date: string;
  category_id?: string;
  shares: GroupExpenseShare[];
  total_settled_amount: string;
  is_fully_settled: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupExpenseShare {
  id: number;
  participant_id: number;
  participant_name: string;
  share_amount: string;
  settled_amount: string;
  is_settled: boolean;
  notes?: string;
}

// Unified Transaction interface matching backend
export interface UnifiedTransaction {
  id: number;
  amount: string;
  description: string;
  date: string;
  currency: string;
  notes?: string;
  external_id?: string;
  status: string;

  // Transaction categorization
  transaction_category: 'standard' | 'investment' | 'lending' | 'recurring_template' | 'group_expense';
  transaction_type: 'income' | 'expense' | 'transfer' | 'buy' | 'sell' | 'dividend' | 'lend' | 'borrow' | 'repayment';

  // Standard transaction fields
  account?: number;
  account_name?: string;
  transfer_account?: number;
  category?: number;
  category_name?: string;
  suggested_category?: number;
  tags?: number[];
  tag_names?: string[];

  // Investment fields
  investment?: number;
  quantity?: string;
  price_per_unit?: string;
  fees: string;

  // Lending fields
  contact_user?: number;
  contact_name?: string;
  contact_email?: string;
  due_date?: string;
  interest_rate?: string;

  // Group expense fields
  group_expense?: number;
  group_expense_title?: string;

  // Recurring template fields
  is_template: boolean;
  template_name?: string;
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  frequency_interval?: number;
  start_date?: string;
  end_date?: string;
  max_executions?: number;
  next_execution_date?: string;
  is_active_template: boolean;
  is_manual: boolean;
  auto_categorize: boolean;
  execution_conditions?: Record<string, any>;

  // Enhanced fields
  merchant_name?: string;
  original_description?: string;
  verified: boolean;
  gmail_message_id?: string;
  metadata?: Record<string, any>;

  // Computed fields for lending
  is_lending: boolean;
  is_group_expense: boolean;
  remaining_amount?: number;
  repayment_percentage?: number;
  is_overdue?: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface LendingTransaction {
  id: number;
  user_id: number;
  contact_id: number;
  contact_name: string;
  account_id: number;
  account_name: string;
  amount: string;
  remaining_amount: string;
  transaction_type: 'lent' | 'borrowed';
  description: string;
  date: string;
  due_date?: string;
  interest_rate?: string;
  repayments: LendingRepayment[];
  is_fully_repaid: boolean;
  repayment_percentage: number;
  status: 'active' | 'overdue' | 'paid' | 'written_off';
  created_at: string;
  updated_at: string;
}

export interface LendingRepayment {
  id: number;
  amount: string;
  date: string;
  notes?: string;
  created_at: string;
}

// Upload Session Types
export interface UploadSession {
  id: number;
  original_filename: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  account?: number;
  account_name?: string;
  total_transactions: number;
  successful_imports: number;
  failed_imports: number;
  duplicate_imports: number;
  processing_started_at?: string;
  processing_completed_at?: string;
  processing_duration?: number;
  success_rate?: number;
  error_message?: string;
  requires_password: boolean;
  password_attempts: number;
  ai_categorization_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionImport {
  id: number;
  upload_session: number;
  statement_import?: number;
  transaction?: number;
  import_status: 'pending' | 'imported' | 'duplicate' | 'failed' | 'skipped';
  raw_data: Record<string, any>;
  parsed_amount?: string;
  parsed_date?: string;
  parsed_description: string;
  error_message?: string;
  suggested_category_confidence?: string;
  ai_merchant_detection: Record<string, any>;
  transaction_details?: {
    id: number;
    amount: string;
    description: string;
    date: string;
    category?: string;
  };
  created_at: string;
}

export interface TransactionLink {
  id: number;
  from_transaction: number;
  to_transaction: number;
  link_type: 'transfer' | 'refund' | 'split_payment' | 'correction' | 'duplicate';
  confidence_score: string;
  is_confirmed: boolean;
  notes?: string;
  auto_detected: boolean;
  from_transaction_details: {
    id: number;
    amount: string;
    description: string;
    date: string;
    account?: string;
  };
  to_transaction_details: {
    id: number;
    amount: string;
    description: string;
    date: string;
    account?: string;
  };
  created_at: string;
}

export interface MerchantPattern {
  id: number;
  pattern: string;
  category: number;
  category_name: string;
  category_color: string;
  merchant_name: string;
  confidence: string;
  usage_count: number;
  last_used?: string;
  is_active: boolean;
  is_user_confirmed: boolean;
  pattern_type: string;
  created_at: string;
}

export interface UploadStats {
  total_sessions: number;
  completed_sessions: number;
  failed_sessions: number;
  processing_sessions: number;
  total_transactions_imported: number;
  total_files_size: number;
  recent_sessions: UploadSession[];
}