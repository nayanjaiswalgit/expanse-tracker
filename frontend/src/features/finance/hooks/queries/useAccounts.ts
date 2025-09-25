import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../api';
import type { Account, BalanceHistory } from '../../../../types';

// Query Keys
export const accountKeys = {
  all: ['accounts'] as const,
  lists: () => [...accountKeys.all, 'list'] as const,
  list: () => [...accountKeys.lists()] as const,
};

// Queries
export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.list(),
    queryFn: () => apiClient.getAccounts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Mutations
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
      apiClient.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Account> }) =>
      apiClient.updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

// Balance History
export const balanceHistoryKeys = {
  all: ['balance-history'] as const,
  lists: () => [...balanceHistoryKeys.all, 'list'] as const,
  list: (accountId: number) => [...balanceHistoryKeys.lists(), accountId] as const,
};

export function useBalanceHistory(accountId: number) {
  return useQuery({
    queryKey: balanceHistoryKeys.list(accountId),
    queryFn: () => apiClient.getAccountBalanceHistory(accountId),
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateBalanceHistoryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entry: Omit<BalanceHistory, 'id' | 'created_at' | 'updated_at'>) =>
      apiClient.createBalanceHistoryEntry(entry),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: balanceHistoryKeys.list(variables.account_id) });
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}