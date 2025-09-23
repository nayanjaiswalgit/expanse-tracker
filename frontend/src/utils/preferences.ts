import type { User } from '../types';

// This will be populated by currency data from the backend
let DYNAMIC_CURRENCY_SYMBOLS: Record<string, string> = {};

export const setCurrencySymbols = (currencyData: Array<{ code: string; symbol: string }>) => {
  DYNAMIC_CURRENCY_SYMBOLS = currencyData.reduce((acc, currency) => {
    acc[currency.code] = currency.symbol;
    return acc;
  }, {} as Record<string, string>);
};

export const getCurrencySymbol = (currencyCode: string): string => {
  return DYNAMIC_CURRENCY_SYMBOLS[currencyCode] || getCurrencyIcon(currencyCode);
};

export const getCurrencyIcon = (currencyCode: string): string => {
  const currencyIcons: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'INR': '₹',
    'CNY': '¥',
    'KRW': '₩',
    'CAD': 'C$',
    'AUD': 'A$',
    'CHF': 'CHF',
    'SGD': 'S$',
    'HKD': 'HK$',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'PLN': 'zł',
    'CZK': 'Kč',
    'HUF': 'Ft',
    'RUB': '₽',
    'BRL': 'R$',
    'MXN': '$',
    'AED': 'د.إ',
    'SAR': '﷼',
    'TRY': '₺',
    'ZAR': 'R',
    'NZD': 'NZ$',
    'THB': '฿',
    'MYR': 'RM',
    'IDR': 'Rp',
    'PHP': '₱',
    'VND': '₫',
  };

  return currencyIcons[currencyCode] || currencyCode;
};

export const formatCurrency = (amount: number, user?: User | null): string => {
  const currency = user?.preferred_currency || 'USD';
  const symbol = getCurrencySymbol(currency);

  // Format number with appropriate decimal places
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${symbol}${formatted}`;
};

export const formatDate = (dateString: string, user?: User | null): string => {
  const date = new Date(dateString);
  const format = user?.preferred_date_format || 'DD/MM/YYYY';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
    default:
      return `${month}/${day}/${year}`;
  }
};

export const formatDateShort = (dateString: string, user?: User | null): string => {
  const date = new Date(dateString);
  const format = user?.preferred_date_format || 'DD/MM/YYYY';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
    default:
      return `${month}/${day}/${year}`;
  }
};

export const getDateInputFormat = (dateString: string): string => {
  // Always return YYYY-MM-DD format for HTML date inputs
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDefaultDateFormat = (user?: User | null): string => {
  return user?.preferred_date_format || 'DD/MM/YYYY';
};

export const getDefaultCurrency = (user?: User | null): string => {
  return user?.preferred_currency || 'INR';
};