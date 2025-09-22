import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  wrapperClassName?: string;
  as?: 'input' | 'textarea';
  multiline?: boolean;
  rows?: number;
  icon?: LucideIcon;
}

export const Input: React.FC<InputProps> = ({
  label,
  className = '',
  wrapperClassName = '',
  as = 'input',
  multiline = false,
  rows = 3,
  icon: Icon,
  ...props
}) => {
  const baseStyles = `
    flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background
    file:border-0 file:bg-transparent file:text-sm file:font-medium
    placeholder:text-muted-foreground
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
    disabled:cursor-not-allowed disabled:opacity-50
    transition-colors duration-200
    border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white
    hover:border-gray-400 dark:hover:border-gray-500
    focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20
  `.trim().replace(/\s+/g, ' ');

  // Determine component type
  const Component = multiline || as === 'textarea' ? 'textarea' : 'input';
  
  // Add rows for textarea
  const componentProps = Component === 'textarea' ? { ...props, rows } : props;

  return (
    <div className={wrapperClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {props.required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <Component
          className={`${baseStyles} ${Icon ? 'pl-10' : ''} ${className}`.trim()}
          {...componentProps}
        />
      </div>
    </div>
  );
};