import React, { useState, useEffect } from 'react';
import { FieldValues } from 'react-hook-form';
import { FormConfig } from '../../types/forms';
import { useObjectForm } from '../../hooks/useObjectForm';
import { FormField } from './FormField';
import { Button } from '../ui/Button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useFormContext } from '../../contexts/FormContext';
import clsx from 'clsx';

interface ObjectFormProps<T extends FieldValues> {
  config: FormConfig<T>;
  className?: string;
}

export function ObjectForm<T extends FieldValues>({
  config,
  className,
}: ObjectFormProps<T>) {
  const { form, isLoading, submit, getFieldError, isFieldVisible } = useObjectForm(config);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { setFormDirty } = useFormContext();

  const {
    control,
    formState: { errors, isDirty },
  } = form;

  // Update form context when form dirty state changes
  useEffect(() => {
    setFormDirty(isDirty);
  }, [isDirty, setFormDirty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submit();
      // Reset form dirty state on successful submission
      setFormDirty(false);
    } catch (error) {
      // Keep form as dirty on error so user doesn't lose changes
      console.error('Form submission error:', error);
    }
  };

  const layoutClasses = {
    vertical: 'space-y-6',
    horizontal: 'space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:items-end',
    grid: 'grid grid-cols-1 md:grid-cols-2 gap-6',
    inline: 'flex flex-wrap gap-4 items-end',
    profile: 'grid grid-cols-1 md:grid-cols-2 gap-6',
  };

  const isProfileLayout = config.layout === 'profile';

  if (isProfileLayout) {
    return (
      <form onSubmit={handleSubmit} className={clsx('w-full', className, config.className)}>
        {config.title && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {config.title}
            </h2>
            {config.description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {config.description}
              </p>
            )}
          </div>
        )}

        {/* Form fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {config.fields
            .filter(field => isFieldVisible(field))
            .map((fieldConfig) => {
              // Smart field sizing based on field type and name
              const isFullWidth =
                fieldConfig.type === 'textarea' ||
                fieldConfig.type === 'email' ||
                fieldConfig.name === 'full_name' ||
                fieldConfig.name === 'website' ||
                fieldConfig.name === 'bio' ||
                fieldConfig.className?.includes('col-span-full');

              return (
                <div
                  key={fieldConfig.name}
                  className={isFullWidth ? 'md:col-span-2' : 'md:col-span-1'}
                >
                  <FormField
                    name={fieldConfig.name as any}
                    control={control}
                    error={errors[fieldConfig.name]}
                    config={fieldConfig}
                    disabled={isLoading || config.submission.disabled}
                  />
                </div>
              );
            })}
        </div>

        {/* Submit button at bottom */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            {config.submission.onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={config.submission.onCancel}
                disabled={isLoading}
              >
                {config.submission.cancelText || 'Cancel'}
              </Button>
            )}
            <Button
              type="submit"
              loading={isLoading}
              disabled={config.submission.disabled}
              className={config.submission.className}
            >
              {config.submission.submitText || 'Submit'}
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={clsx('w-full', className, config.className)}>
      {config.title && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {config.title}
          </h2>
          {config.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {config.description}
            </p>
          )}
        </div>
      )}

      {/* Essential Fields */}
      <div className={clsx(
        config.layout ? layoutClasses[config.layout] : layoutClasses.vertical
      )}>
        {config.fields
          .filter(field => isFieldVisible(field))
          .map((fieldConfig) => (
            <FormField
              key={fieldConfig.name}
              name={fieldConfig.name as any}
              control={control}
              error={errors[fieldConfig.name]}
              config={fieldConfig}
              disabled={isLoading || config.submission.disabled}
            />
          ))}
      </div>

      {/* Advanced Fields Toggle - Below entire form */}
      {config.advancedFields && config.advancedFields.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            {showAdvanced ? (
              <ChevronDown className="w-4 h-4 mr-1" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-1" />
            )}
            More Options
          </button>

          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              {config.advancedFields
                .filter(field => isFieldVisible(field))
                .map((fieldConfig) => (
                  <FormField
                    key={fieldConfig.name}
                    name={fieldConfig.name as any}
                    control={control}
                    error={errors[fieldConfig.name]}
                    config={fieldConfig}
                    disabled={isLoading || config.submission.disabled}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end space-x-3">
        {config.submission.onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={config.submission.onCancel}
            disabled={isLoading}
          >
            {config.submission.cancelText || 'Cancel'}
          </Button>
        )}
        <Button
          type="submit"
          loading={isLoading}
          disabled={config.submission.disabled}
          className={config.submission.className}
        >
          {config.submission.submitText || 'Submit'}
        </Button>
      </div>
    </form>
  );
}