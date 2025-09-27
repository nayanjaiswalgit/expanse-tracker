import React from 'react';
import { SearchableSelect } from './SearchableSelect';

interface Option {
  value: string | number;
  label: string;
  description?: string;
}

interface SelectProps {
  options: Option[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  label?: string;
  wrapperClassName?: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  searchPlaceholder?: string;
  maxHeight?: string;
  autoWidth?: boolean;
  minWidth?: string;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  label,
  className = '',
  wrapperClassName = '',
  placeholder = "Select an option",
  required = false,
  disabled = false,
  allowClear = true,
  searchPlaceholder = "Search options...",
  maxHeight = "240px",
  autoWidth = false,
  minWidth = "120px",
  ...props
}) => {
  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={onChange || (() => {})}
      label={label}
      wrapperClassName={wrapperClassName}
      className={className}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      allowClear={allowClear}
      searchPlaceholder={searchPlaceholder}
      maxHeight={maxHeight}
      autoWidth={autoWidth}
      minWidth={minWidth}
    />
  );
};
