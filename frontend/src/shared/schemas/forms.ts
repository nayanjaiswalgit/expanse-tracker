import { z } from 'zod';

export const uploadFileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 50 * 1024 * 1024, 'File must be smaller than 50MB')
    .refine((file) => {
      const allowedTypes = [
        'text/csv',
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/json'
      ];
      return allowedTypes.includes(file.type);
    }, 'File type not supported'),
  account_id: z
    .number()
    .min(1, 'Please select an account'),
  password: z
    .string()
    .optional(),
  date_format: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'], {
    required_error: 'Please select a date format',
  }),
  currency_column: z
    .string()
    .optional(),
  skip_first_row: z.boolean(),
  duplicate_handling: z.enum(['skip', 'update', 'create_new'], {
    required_error: 'Please select duplicate handling strategy',
  }),
});

export const goalSchema = z.object({
  name: z
    .string()
    .min(1, 'Goal name is required')
    .max(100, 'Goal name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  goal_type: z.enum(['savings', 'spending', 'debt_payoff', 'investment'], {
    required_error: 'Please select a goal type',
  }),
  target_amount: z
    .string()
    .min(1, 'Target amount is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Target amount must be a positive number'),
  current_amount: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Current amount must be non-negative')
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code'),
  start_date: z
    .string()
    .min(1, 'Start date is required'),
  target_date: z
    .string()
    .min(1, 'Target date is required'),
  category: z
    .number()
    .optional(),
  account: z
    .number()
    .optional(),
  auto_track: z.boolean(),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color'),
  priority: z
    .number()
    .min(1, 'Priority must be at least 1')
    .max(5, 'Priority must be at most 5'),
});

export const recurringTransactionSchema = z.object({
  name: z
    .string()
    .min(1, 'Transaction name is required')
    .max(100, 'Name must be less than 100 characters'),
  transaction_type: z.enum(['expense', 'income'], {
    required_error: 'Please select transaction type',
  }),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Amount must be a positive number'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
    required_error: 'Please select frequency',
  }),
  frequency_interval: z
    .number()
    .min(1, 'Interval must be at least 1')
    .max(365, 'Interval must be at most 365'),
  start_date: z
    .string()
    .min(1, 'Start date is required'),
  end_date: z
    .string()
    .optional(),
  max_executions: z
    .number()
    .min(1, 'Max executions must be at least 1')
    .optional(),
  account: z
    .number()
    .min(1, 'Please select an account'),
  category: z
    .number()
    .min(1, 'Please select a category'),
  description: z
    .string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
});

export const investmentAdvancedSchema = z.object({
  name: z
    .string()
    .min(1, 'Investment name is required')
    .max(100, 'Name must be less than 100 characters'),
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol must be less than 10 characters')
    .toUpperCase(),
  investment_type: z.enum(['stock', 'bond', 'mutual_fund', 'etf', 'crypto', 'other'], {
    required_error: 'Please select investment type',
  }),
  current_price: z
    .string()
    .min(1, 'Current price is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Price must be a positive number'),
  sector: z
    .string()
    .max(50, 'Sector must be less than 50 characters')
    .optional(),
  country: z
    .string()
    .max(50, 'Country must be less than 50 characters')
    .optional(),
  exchange: z
    .string()
    .max(20, 'Exchange must be less than 20 characters')
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code'),
  dividend_yield: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Dividend yield must be non-negative')
    .optional(),
  pe_ratio: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'P/E ratio must be non-negative')
    .optional(),
  market_cap: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Market cap must be non-negative')
    .optional(),
  risk_rating: z.enum(['very_low', 'low', 'moderate', 'high', 'very_high'], {
    required_error: 'Please select risk rating',
  }),
  auto_track: z.boolean(),
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
});

export const passwordPromptSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

export const telegramBotSchema = z.object({
  name: z
    .string()
    .min(1, 'Bot name is required')
    .max(100, 'Bot name must be less than 100 characters'),
  token: z
    .string()
    .min(1, 'Bot token is required')
    .regex(/^\d+:[A-Za-z0-9_-]+$/, 'Invalid bot token format'),
  webhook_url: z
    .string()
    .url('Please enter a valid webhook URL')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  is_active: z.boolean(),
  auto_categorize: z.boolean(),
  default_category: z
    .string()
    .optional(),
  timezone: z
    .string()
    .optional(),
  language: z.enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja'], {
    required_error: 'Please select a language',
  }),
});

export const automationRuleSchema = z.object({
  name: z
    .string()
    .min(1, 'Rule name is required')
    .max(100, 'Rule name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  trigger_type: z.enum(['transaction_added', 'amount_threshold', 'date_based', 'keyword_match'], {
    required_error: 'Please select trigger type',
  }),
  trigger_conditions: z.record(z.any()),
  action_type: z.enum(['categorize', 'tag', 'move_to_account', 'create_reminder', 'send_notification'], {
    required_error: 'Please select action type',
  }),
  action_parameters: z.record(z.any()),
  is_active: z.boolean(),
  priority: z
    .number()
    .min(1, 'Priority must be at least 1')
    .max(10, 'Priority must be at most 10'),
});

export type UploadFileFormData = z.infer<typeof uploadFileSchema>;
export type GoalAdvancedFormData = z.infer<typeof goalSchema>;
export type RecurringTransactionFormData = z.infer<typeof recurringTransactionSchema>;
export type InvestmentAdvancedFormData = z.infer<typeof investmentAdvancedSchema>;
export type PasswordPromptFormData = z.infer<typeof passwordPromptSchema>;
export type TelegramBotFormData = z.infer<typeof telegramBotSchema>;
export type AutomationRuleFormData = z.infer<typeof automationRuleSchema>;