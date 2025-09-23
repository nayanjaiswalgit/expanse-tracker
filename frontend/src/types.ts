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
  user_id: number;
  name: string;
  account_type: 'checking' | 'savings' | 'credit' | 'investment' | 'loan' | 'cash' | 'other';
  balance: string;
  currency: string;
  is_active: boolean;
  institution?: string;
  account_number_last4?: string;
  tags?: string[];
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
  target_amount: string;
  current_amount: string;
  target_date?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  progress_percentage: number;
  remaining_amount: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
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