import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../../contexts/AuthContext';
import { apiClient } from '../../../../api/client';

export const useCurrency = () => {
  const { state: authState } = useAuth();

  const { data: currencyData, isLoading, error } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => apiClient.getSupportedCurrencies(),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    cacheTime: 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  const currencies = currencyData?.currencies || [];

  const getDefaultCurrency = () => {
    return authState.user?.preferred_currency || 'USD';
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency?.symbol || currencyCode;
  };

  const getCurrencyName = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency?.name || currencyCode;
  };

  return {
    currencies,
    isLoading,
    error,
    getDefaultCurrency,
    getCurrencySymbol,
    getCurrencyName
  };
};