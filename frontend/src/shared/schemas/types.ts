import { z } from 'zod';
import { ReactNode } from 'react';
import { FieldPath, FieldValues, Control, FieldError, RegisterOptions } from 'react-hook-form';

// ===== CORE FORM TYPES =====
export interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export type FieldType =
  | 'input'
  | 'email'
  | 'password'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'textarea'
  | 'currency'
  | 'file'
  | 'date'
  | 'tags';

export interface ConditionalLogic {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface FieldValidation extends RegisterOptions {
  message?: string;
}

export interface FormFieldConfig {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  description?: string;
  options?: Option[];
  conditional?: ConditionalLogic;
  validation?: FieldValidation;
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
  accept?: string; // for file inputs
  currency?: string; // for currency fields
  step?: number; // for number inputs
  min?: number;
  max?: number;
  rows?: number; // for textarea
}

export type FormLayout = 'vertical' | 'horizontal' | 'grid' | 'inline' | 'profile';

export interface FormSubmissionConfig {
  onSubmit: (data: any) => Promise<void> | void;
  onError?: (error: any) => void;
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface ValidationConfig {
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';
  reValidateMode?: 'onChange' | 'onBlur' | 'onSubmit';
  shouldFocusError?: boolean;
}

export interface FormConfig<T extends FieldValues> {
  schema: z.ZodSchema<T>;
  fields: FormFieldConfig[];
  layout?: FormLayout;
  submission: FormSubmissionConfig;
  validation?: ValidationConfig;
  defaultValues?: Partial<T>;
  className?: string;
  title?: string;
  description?: string;
}

export interface FormFieldProps<T extends FieldValues = FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  error?: FieldError;
  config: FormFieldConfig;
  disabled?: boolean;
}

export interface FormSectionConfig {
  title?: string;
  description?: string;
  fields: FormFieldConfig[];
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export interface MultiStepFormConfig<T extends FieldValues> {
  schema: z.ZodSchema<T>;
  steps: FormSectionConfig[];
  submission: FormSubmissionConfig;
  validation?: ValidationConfig;
  defaultValues?: Partial<T>;
  showStepIndicator?: boolean;
  allowStepNavigation?: boolean;
}

export interface DynamicFormConfig<T extends FieldValues> extends FormConfig<T> {
  dependencies?: Record<string, string[]>;
  transformData?: (data: T) => any;
  onFieldChange?: (field: string, value: any, formData: T) => void;
}

export interface FormContextValue<T extends FieldValues = FieldValues> {
  config: FormConfig<T>;
  isSubmitting: boolean;
  errors: Record<string, FieldError>;
  isDirty: boolean;
  isValid: boolean;
  formData: Partial<T>;
}

export type FormHookReturn<T extends FieldValues> = {
  form: any; // UseFormReturn<T> but avoiding full type import
  isLoading: boolean;
  submit: () => Promise<void>;
  reset: (data?: Partial<T>) => void;
  getFieldError: (name: FieldPath<T>) => string | undefined;
  isFieldVisible: (field: FormFieldConfig) => boolean;
};

// ===== COMPONENT-SPECIFIC TYPES =====

// Finance Types
export interface AccountFormData {
  id?: number;
  name: string;
  account_type: 'checking' | 'savings' | 'credit' | 'investment' | 'loan' | 'cash' | 'other';
  balance: number;
  currency: string;
  institution?: string;
  description?: string;
  is_active: boolean;
}

export interface MerchantPatternFormData {
  id?: number;
  pattern: string;
  merchant_name: string;
  category: string;
  subcategory?: string;
  is_regex: boolean;
  case_sensitive: boolean;
  is_active: boolean;
}

// Dashboard Types
export interface AnalyticsData {
  totalTransactions: number;
  totalIncome: number;
  totalExpenses: number;
  monthlyTrend: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  recentTransactions: Array<{
    id: number;
    description: string;
    amount: number;
    date: string;
    category: string;
  }>;
}

// Goals Legacy Type (to be migrated)
export interface GoalFormDataLegacy {
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  goal_type: 'savings' | 'debt_payoff' | 'investment' | 'expense_reduction' | 'income_increase' | 'emergency_fund' | 'retirement' | 'education' | 'travel' | 'home' | 'car' | 'other';
  category?: string;
  priority: 'low' | 'medium' | 'high';
  is_active: boolean;
  auto_contribute?: boolean;
  contribution_frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  contribution_amount?: number;
}