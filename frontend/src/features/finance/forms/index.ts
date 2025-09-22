import { FormConfig } from '../../../shared/schemas';
import {
  accountSchema,
  AccountFormData,
  merchantPatternSchema,
  MerchantPatternFormData,
  accountManagementSchema,
  AccountManagementFormData,
  bankStatementUploadSchema,
  BankStatementUploadFormData,
  transactionSettingsSchema,
  TransactionSettingsFormData
} from '../schemas';

export const createAccountFormConfig = (
  onSubmit: (data: AccountFormData) => Promise<void>,
  isLoading?: boolean,
  initialData?: Partial<AccountFormData>,
  isEdit = false
): FormConfig<AccountFormData> => {
  const accountTypeOptions = [
    { value: 'checking', label: 'Checking Account' },
    { value: 'savings', label: 'Savings Account' },
    { value: 'credit', label: 'Credit Card' },
    { value: 'investment', label: 'Investment Account' },
    { value: 'loan', label: 'Loan Account' },
    { value: 'cash', label: 'Cash' },
    { value: 'other', label: 'Other' },
  ];

  return {
    schema: accountSchema,
    title: isEdit ? 'Edit Account' : 'Add New Account',
    description: isEdit
      ? 'Update your account information below.'
      : 'Create a new financial account to track your money.',
    fields: [
      {
        name: 'name',
        type: 'input',
        label: 'Account Name',
        placeholder: 'e.g., Main Checking, Emergency Savings',
        validation: { required: true },
        description: 'Choose a descriptive name for easy identification',
      },
      {
        name: 'account_type',
        type: 'select',
        label: 'Account Type',
        options: accountTypeOptions,
        validation: { required: true },
        description: 'Select the type that best describes this account',
      },
      {
        name: 'balance',
        type: 'currency',
        label: 'Initial Balance',
        placeholder: '0.00',
        validation: { required: true },
        description: 'Enter the current balance of this account',
      },
      {
        name: 'currency',
        type: 'select',
        label: 'Currency',
        options: [
          { value: 'USD', label: 'USD - US Dollar' },
          { value: 'EUR', label: 'EUR - Euro' },
          { value: 'GBP', label: 'GBP - British Pound' },
          { value: 'JPY', label: 'JPY - Japanese Yen' },
          { value: 'CAD', label: 'CAD - Canadian Dollar' },
          { value: 'AUD', label: 'AUD - Australian Dollar' },
          { value: 'CHF', label: 'CHF - Swiss Franc' },
          { value: 'CNY', label: 'CNY - Chinese Yuan' },
          { value: 'INR', label: 'INR - Indian Rupee' },
        ],
        validation: { required: true },
      },
      {
        name: 'institution',
        type: 'input',
        label: 'Financial Institution',
        placeholder: 'e.g., Chase Bank, Wells Fargo',
        description: 'The bank or institution where this account is held (optional)',
      },
      {
        name: 'account_number_last4',
        type: 'input',
        label: 'Last 4 Digits',
        placeholder: '1234',
        description: 'Last 4 digits of account number for identification (optional)',
        validation: {
          pattern: {
            value: /^\d{4}$/,
            message: 'Must be exactly 4 digits',
          },
        },
      },
      {
        name: 'tags',
        type: 'tags',
        label: 'Tags',
        placeholder: 'Add tags to categorize this account',
        description: 'Add relevant tags like "personal", "business", "emergency", etc.',
      },
    ],
    layout: 'vertical',
    submission: {
      onSubmit,
      submitText: isEdit ? 'Update Account' : 'Create Account',
      cancelText: 'Cancel',
      loading: isLoading,
    },
    validation: {
      mode: 'onBlur',
      shouldFocusError: true,
    },
    defaultValues: {
      name: '',
      account_type: 'checking',
      balance: '0.00',
      currency: 'USD',
      institution: '',
      account_number_last4: '',
      tags: [],
      ...initialData,
    },
  };
};

export const createQuickAccountFormConfig = (
  onSubmit: (data: Pick<AccountFormData, 'name' | 'account_type' | 'balance'>) => Promise<void>,
  isLoading?: boolean
): FormConfig<Pick<AccountFormData, 'name' | 'account_type' | 'balance'>> => ({
  schema: accountSchema.pick({ name: true, account_type: true, balance: true }),
  title: 'Quick Add Account',
  fields: [
    {
      name: 'name',
      type: 'input',
      label: 'Account Name',
      placeholder: 'Enter account name',
      validation: { required: true },
    },
    {
      name: 'account_type',
      type: 'select',
      label: 'Type',
      options: [
        { value: 'checking', label: 'Checking' },
        { value: 'savings', label: 'Savings' },
        { value: 'credit', label: 'Credit Card' },
        { value: 'cash', label: 'Cash' },
      ],
      validation: { required: true },
    },
    {
      name: 'balance',
      type: 'currency',
      label: 'Balance',
      placeholder: '0.00',
      validation: { required: true },
    },
  ],
  layout: 'grid',
  submission: {
    onSubmit,
    submitText: 'Add Account',
    loading: isLoading,
  },
  defaultValues: {
    name: '',
    account_type: 'checking',
    balance: '0.00',
  },
});

// Enhanced Account Management Form Config (for AccountsManagement component)
export const createAccountManagementFormConfig = (
  onSubmit: (data: AccountManagementFormData) => Promise<void>,
  isLoading?: boolean,
  initialData?: Partial<AccountManagementFormData>,
  isEdit = false
): FormConfig<AccountManagementFormData> => ({
  schema: accountManagementSchema,
  title: isEdit ? 'Edit Account' : 'Add New Account',
  description: isEdit
    ? 'Update your account details below.'
    : 'Add a new financial account to track your transactions.',
  fields: [
    {
      name: 'name',
      type: 'input',
      label: 'Account Name',
      placeholder: 'e.g., Main Checking, Savings Account',
      validation: { required: true },
      description: 'Give your account a descriptive name',
    },
    {
      name: 'account_type',
      type: 'select',
      label: 'Account Type',
      options: [
        { value: 'checking', label: 'Checking Account' },
        { value: 'savings', label: 'Savings Account' },
        { value: 'credit', label: 'Credit Card' },
        { value: 'investment', label: 'Investment Account' },
        { value: 'loan', label: 'Loan Account' },
        { value: 'other', label: 'Other' },
      ],
      validation: { required: true },
    },
    {
      name: 'balance',
      type: 'currency',
      label: 'Current Balance',
      placeholder: '0.00',
      validation: { required: true },
      description: 'Enter the current balance of this account',
    },
    {
      name: 'currency',
      type: 'select',
      label: 'Currency',
      options: [
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'EUR', label: 'EUR - Euro' },
        { value: 'GBP', label: 'GBP - British Pound' },
        { value: 'JPY', label: 'JPY - Japanese Yen' },
        { value: 'CAD', label: 'CAD - Canadian Dollar' },
        { value: 'AUD', label: 'AUD - Australian Dollar' },
      ],
      validation: { required: true },
    },
    {
      name: 'institution',
      type: 'input',
      label: 'Institution',
      placeholder: 'e.g., Chase Bank, Wells Fargo',
      description: 'The financial institution (optional)',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      placeholder: 'Add any additional notes about this account...',
      rows: 3,
      description: 'Optional description or notes',
      className: 'col-span-full',
    },
    {
      name: 'is_active',
      type: 'checkbox',
      label: 'Account is active',
      description: 'Uncheck to mark this account as inactive',
    },
  ],
  layout: 'grid',
  submission: {
    onSubmit,
    submitText: isEdit ? 'Update Account' : 'Add Account',
    loading: isLoading,
  },
  validation: {
    mode: 'onBlur',
    shouldFocusError: true,
  },
  defaultValues: {
    name: '',
    account_type: 'checking',
    balance: 0,
    currency: 'USD',
    institution: '',
    description: '',
    is_active: true,
    ...initialData,
  },
});

// Merchant Pattern Form Config (for MerchantPatterns component)
export const createMerchantPatternFormConfig = (
  onSubmit: (data: MerchantPatternFormData) => Promise<void>,
  isLoading?: boolean,
  initialData?: Partial<MerchantPatternFormData>,
  isEdit = false
): FormConfig<MerchantPatternFormData> => ({
  schema: merchantPatternSchema,
  title: isEdit ? 'Edit Merchant Pattern' : 'Add Merchant Pattern',
  description: isEdit
    ? 'Update the merchant pattern rules below.'
    : 'Create a new rule to automatically categorize transactions from this merchant.',
  fields: [
    {
      name: 'pattern',
      type: 'input',
      label: 'Pattern',
      placeholder: 'e.g., AMAZON*, STARBUCKS, or specific regex pattern',
      validation: { required: true },
      description: 'Text pattern to match in transaction descriptions',
    },
    {
      name: 'merchant_name',
      type: 'input',
      label: 'Merchant Name',
      placeholder: 'e.g., Amazon, Starbucks, Shell Gas Station',
      validation: { required: true },
      description: 'The friendly name for this merchant',
    },
    {
      name: 'category',
      type: 'input',
      label: 'Category',
      placeholder: 'e.g., Shopping, Food & Dining, Transportation',
      validation: { required: true },
      description: 'Main category for transactions from this merchant',
    },
    {
      name: 'subcategory',
      type: 'input',
      label: 'Subcategory',
      placeholder: 'e.g., Online Shopping, Coffee Shops, Gas Stations',
      description: 'Optional subcategory for more specific classification',
    },
    {
      name: 'is_regex',
      type: 'checkbox',
      label: 'Use as regular expression',
      description: 'Check if this pattern is a regular expression',
    },
    {
      name: 'case_sensitive',
      type: 'checkbox',
      label: 'Case sensitive matching',
      description: 'Check if pattern matching should be case sensitive',
    },
    {
      name: 'is_active',
      type: 'checkbox',
      label: 'Pattern is active',
      description: 'Uncheck to disable this pattern temporarily',
    },
  ],
  layout: 'vertical',
  submission: {
    onSubmit,
    submitText: isEdit ? 'Update Pattern' : 'Add Pattern',
    loading: isLoading,
  },
  validation: {
    mode: 'onBlur',
    shouldFocusError: true,
  },
  defaultValues: {
    pattern: '',
    merchant_name: '',
    category: '',
    subcategory: '',
    is_regex: false,
    case_sensitive: false,
    is_active: true,
    ...initialData,
  },
});

// Bank Statement Upload Form Config
export const createBankStatementUploadFormConfig = (
  onSubmit: (data: BankStatementUploadFormData) => Promise<void>,
  isLoading?: boolean,
  accounts: Array<{ id: string; name: string; type: string }> = [],
  supportedBanks: Array<{ key: string; name: string }> = [],
  showTextInput = false
): FormConfig<BankStatementUploadFormData> => ({
  schema: bankStatementUploadSchema,
  title: 'Upload Bank Statement',
  description: 'Import transactions from bank statements with automatic parsing',
  fields: [
    ...(showTextInput
      ? [
          {
            name: 'textContent' as const,
            type: 'textarea' as const,
            label: 'Bank Statement Content',
            placeholder: 'Paste your bank statement content here (CSV format preferred)...',
            rows: 10,
            validation: { required: !showTextInput },
            description: 'Paste the content of your bank statement',
            className: 'font-mono text-sm',
          },
        ]
      : [
          {
            name: 'file' as const,
            type: 'file' as const,
            label: 'Bank Statement File',
            accept: '.csv,.txt,.tsv',
            validation: { required: !showTextInput },
            description: 'Upload CSV, TXT, or TSV files up to 10MB',
          },
        ]),
    {
      name: 'account_id',
      type: 'select',
      label: 'Account (Optional)',
      placeholder: 'Select account (optional)',
      options: [
        { value: '', label: 'Select account (optional)' },
        ...accounts.map((account) => ({
          value: account.id,
          label: `${account.name} (${account.type})`,
        })),
      ],
      description: 'Associate transactions with a specific account',
    },
    {
      name: 'bank_format',
      type: 'select',
      label: 'Bank Format',
      options: [
        { value: 'auto', label: 'Auto-detect' },
        ...supportedBanks.map((bank) => ({
          value: bank.key,
          label: bank.name,
        })),
      ],
      description: 'Specify bank format or let the system auto-detect',
    },
  ],
  layout: 'vertical',
  submission: {
    onSubmit,
    submitText: isLoading ? 'Processing...' : showTextInput ? 'Parse Text' : 'Upload & Parse',
    loading: isLoading,
  },
  validation: {
    mode: 'onBlur',
    shouldFocusError: true,
  },
  defaultValues: {
    account_id: '',
    bank_format: 'auto',
    textContent: '',
  },
});

// Transaction Settings Form Config
export const createTransactionSettingsFormConfig = (
  onSubmit: (data: TransactionSettingsFormData) => Promise<void>,
  isLoading?: boolean,
  initialData?: Partial<TransactionSettingsFormData>,
  categories: Array<{ value: string; label: string }> = []
): FormConfig<TransactionSettingsFormData> => ({
  schema: transactionSettingsSchema,
  title: 'Transaction Settings',
  description: 'Configure how transactions are processed and managed',
  fields: [
    // Default Settings Section
    {
      name: 'default_transaction_source',
      type: 'select',
      label: 'Default Transaction Source',
      options: [
        { value: 'manual', label: 'Manual Entry' },
        { value: 'import', label: 'File Import' },
        { value: 'api', label: 'API Integration' },
        { value: 'auto', label: 'Automatic Detection' },
      ],
      description: 'Default source when creating new transactions',
    },
    {
      name: 'default_category_id',
      type: 'select',
      label: 'Default Category',
      placeholder: 'Select default category (optional)',
      options: [
        { value: '', label: 'No default category' },
        ...categories,
      ],
      description: 'Default category for new transactions',
    },
    {
      name: 'default_tags',
      type: 'input',
      label: 'Default Tags',
      placeholder: 'e.g., uncategorized, review',
      description: 'Comma-separated tags to apply to new transactions',
    },

    // Processing Settings
    {
      name: 'auto_categorize_transactions',
      type: 'checkbox',
      label: 'Auto-categorize transactions',
      description: 'Automatically categorize transactions based on merchant patterns',
    },
    {
      name: 'require_verification',
      type: 'checkbox',
      label: 'Require verification for auto-categorized transactions',
      description: 'Mark auto-categorized transactions as requiring manual review',
    },
    {
      name: 'enable_transaction_suggestions',
      type: 'checkbox',
      label: 'Enable transaction suggestions',
      description: 'Show suggested categories and merchants based on transaction history',
    },

    // Duplicate Detection
    {
      name: 'duplicate_detection_enabled',
      type: 'checkbox',
      label: 'Enable duplicate detection',
      description: 'Automatically detect and flag potential duplicate transactions',
    },
    {
      name: 'duplicate_detection_days',
      type: 'number',
      label: 'Duplicate detection window (days)',
      placeholder: '7',
      min: 1,
      max: 365,
      description: 'Number of days to look back when checking for duplicates',
      conditional: {
        field: 'duplicate_detection_enabled',
        operator: 'equals',
        value: true,
      },
    },

    // Transfer Detection
    {
      name: 'auto_mark_transfers',
      type: 'checkbox',
      label: 'Auto-mark transfers between accounts',
      description: 'Automatically identify and mark transfers between your accounts',
    },
    {
      name: 'minimum_transfer_amount',
      type: 'currency',
      label: 'Minimum transfer amount',
      placeholder: '0.00',
      description: 'Minimum amount to consider as a potential transfer',
      conditional: {
        field: 'auto_mark_transfers',
        operator: 'equals',
        value: true,
      },
    },

    // Receipt Settings
    {
      name: 'enable_receipt_scanning',
      type: 'checkbox',
      label: 'Enable receipt scanning',
      description: 'Allow uploading and processing receipt images',
    },
    {
      name: 'auto_create_from_receipts',
      type: 'checkbox',
      label: 'Auto-create transactions from receipts',
      description: 'Automatically create transactions when receipts are processed',
      conditional: {
        field: 'enable_receipt_scanning',
        operator: 'equals',
        value: true,
      },
    },
  ],
  layout: 'vertical',
  submission: {
    onSubmit,
    submitText: isLoading ? 'Saving...' : 'Save Settings',
    loading: isLoading,
  },
  validation: {
    mode: 'onBlur',
    shouldFocusError: true,
  },
  defaultValues: {
    default_category_id: '',
    auto_categorize_transactions: true,
    require_verification: false,
    default_tags: '',
    enable_transaction_suggestions: true,
    duplicate_detection_enabled: true,
    duplicate_detection_days: 7,
    default_transaction_source: 'manual',
    auto_mark_transfers: true,
    minimum_transfer_amount: 0,
    enable_receipt_scanning: true,
    auto_create_from_receipts: false,
    ...initialData,
  },
});