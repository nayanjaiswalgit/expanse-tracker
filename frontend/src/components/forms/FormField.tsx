import { Controller, FieldValues } from 'react-hook-form';
import { FormFieldProps } from '../../types/forms';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { CurrencyField } from '../ui/CurrencyField';
import { TagInput } from '../ui/TagInput';
import { Calendar, Check } from 'lucide-react';
import clsx from 'clsx';

export function FormField<T extends FieldValues>({
  name,
  control,
  error,
  config,
  disabled,
}: FormFieldProps<T>) {
  const renderField = (field: any) => {
    const commonProps = {
      disabled: disabled || config.disabled,
      placeholder: config.placeholder,
      className: config.className,
    };

    switch (config.type) {
      case 'input':
      case 'email':
      case 'password':
        return (
          <Input
            {...commonProps}
            type={config.type === 'input' ? 'text' : config.type}
            {...field}
          />
        );

      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            step={config.step}
            min={config.min}
            max={config.max}
            {...field}
            onChange={(e) => field.onChange(Number(e.target.value))}
            className={clsx(
              commonProps.className,
              // Hide default number input arrows with Tailwind utilities
              '[&::-webkit-outer-spin-button]:appearance-none',
              '[&::-webkit-inner-spin-button]:appearance-none',
              '[&::-webkit-inner-spin-button]:m-0',
              '[appearance:textfield]' // For Firefox
            )}
          />
        );

      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={config.rows || 3}
            className={clsx(
              'min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'transition-colors duration-200',
              'border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white',
              'hover:border-gray-400 dark:hover:border-gray-500',
              'focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20',
              config.className
            )}
            {...field}
          />
        );

      case 'select':
        return (
          <Select
            {...commonProps}
            options={config.options || []}
            value={field.value}
            onChange={(value) => field.onChange(value)}
            searchable={config.searchable !== false}
            allowClear={config.allowClear !== false}
            searchPlaceholder={config.searchPlaceholder || "Search options..."}
          />
        );

      case 'checkbox':
        return (
          <label className="flex items-start space-x-3 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                className="sr-only"
                disabled={disabled || config.disabled}
                {...field}
                checked={field.value}
              />
              <div className={clsx(
                'h-5 w-5 rounded border-2 flex items-center justify-center transition-all duration-200',
                'border-gray-300 bg-white dark:border-gray-500 dark:bg-gray-700',
                'hover:border-blue-400 dark:hover:border-blue-400',
                'focus-within:ring-2 focus-within:ring-blue-500/20',
                field.value && 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500',
                (disabled || config.disabled) && 'opacity-50 cursor-not-allowed'
              )}>
                {field.value && (
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                )}
              </div>
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                {config.label}
              </span>
              {config.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {config.description}
                </p>
              )}
            </div>
          </label>
        );

      case 'radio':
        return (
          <div>
            {config.options?.map((option, index) => (
              <label
                key={option.value}
                className={`flex items-start space-x-4 cursor-pointer group p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 ${index > 0 ? 'mt-4' : ''}`}
              >
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    type="radio"
                    value={option.value}
                    className="h-5 w-5 border-2 border-gray-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-0 focus:ring-2 transition-all duration-200 dark:border-gray-500 dark:bg-gray-700 checked:border-blue-600 checked:bg-blue-600 hover:border-blue-400 dark:hover:border-blue-400"
                    disabled={disabled || config.disabled || option.disabled}
                    checked={field.value === option.value}
                    onChange={(e) => {
                      if (e.target.checked) {
                        field.onChange(option.value);
                      }
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                      {option.label}
                    </span>
                  </div>
                  {option.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {option.description}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        );

      case 'currency':
        return (
          <CurrencyField
            {...commonProps}
            {...field}
          />
        );

      case 'file':
        return (
          <input
            type="file"
            accept={config.accept}
            multiple={config.multiple}
            disabled={disabled || config.disabled}
            className={clsx(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
              'placeholder:text-muted-foreground cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white',
              'hover:border-gray-400 dark:hover:border-gray-500',
              config.className
            )}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              field.onChange(config.multiple ? files : files[0]);
            }}
          />
        );

      case 'date':
        return (
          <div className="relative">
            <Input
              {...commonProps}
              type="date"
              {...field}
              className={clsx(
                commonProps.className,
                'pr-10' // Add padding for calendar icon
              )}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
        );

      case 'tags':
        return (
          <TagInput
            tags={field.value || []}
            onChange={field.onChange}
            disabled={disabled || config.disabled}
            placeholder={config.placeholder}
          />
        );

      default:
        return (
          <Input
            {...commonProps}
            {...field}
          />
        );
    }
  };

  return (
    <div className="space-y-1">
      {config.type !== 'checkbox' && config.type !== 'radio' && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {config.label}
          {config.validation?.required && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
      )}

      {config.type === 'radio' && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {config.label}
            {config.validation?.required && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
          {config.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {config.description}
            </p>
          )}
        </div>
      )}

      {config.description && config.type !== 'radio' && config.type !== 'checkbox' && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {config.description}
        </p>
      )}

      <Controller
        name={name}
        control={control}
        rules={config.validation}
        render={({ field }) => renderField(field)}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {typeof error === 'string' ? error : error?.message || 'Invalid input'}
        </p>
      )}
    </div>
  );
}