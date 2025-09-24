import React from "react";
import { useCurrency } from "../../features/finance/hooks/queries/useCurrency";

interface CurrencyFieldProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  label?: string;
  disabled?: boolean;
}

export const CurrencyField: React.FC<CurrencyFieldProps> = ({
  value,
  onChange,
  required = false,
  className = "",
  label,
  disabled = false,
}) => {
  const { currencies } = useCurrency();

  return (
    <select
      required={required}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 ${className}`}
    >
      <option value="" disabled>Select currency</option>
      {Array.isArray(currencies) && currencies.map((currency) => (
        <option key={currency.code} value={currency.code}>
          {currency.symbol} {currency.code}
        </option>
      ))}
    </select>
  );
};
