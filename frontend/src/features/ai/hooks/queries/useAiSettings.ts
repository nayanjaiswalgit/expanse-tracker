import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../api';

export interface AISettings {
  preferred_provider: 'openai' | 'ollama' | 'system';
  openai_api_key: string;
  openai_model: string;
  ollama_endpoint: string;
  ollama_model: string;
  enable_categorization: boolean;
  enable_transaction_parsing: boolean;
  enable_receipt_ocr: boolean;
  enable_monthly_reports: boolean;
  confidence_threshold: number;
  max_monthly_usage: number;
  auto_approve_high_confidence: boolean;
}

export interface UsageStats {
  total_requests: number;
  successful_requests: number;
  success_rate: number;
  total_credits_used: number;
  total_tokens_used: number;
  avg_processing_time: number;
  credits_remaining: number;
  provider_stats: Record<string, { requests: number; tokens: number; avg_time: number; success_rate: number; credits: number }>;
  operation_stats: Record<string, { count: number; credits_used: number; success_rate: number }>;
  daily_usage: Array<{ date: string; requests: number; credits: number }>;
}

export interface SystemStatus {
  system_openai_status: 'available' | 'unavailable' | 'error';
  system_ollama_status: 'available' | 'unavailable' | 'error';
  system_openai_endpoint: string | null;
  system_ollama_endpoint: string | null;
  credit_costs: Record<string, number>;
}

const keys = {
  settings: ['ai-settings', 'settings'] as const,
  usage: (days: number) => ['ai-settings', 'usage', days] as const,
  system: ['ai-settings', 'system'] as const,
};

export function useAISettings() {
  return useQuery({
    queryKey: keys.settings,
    queryFn: async (): Promise<{ settings: AISettings }> => {
      const res = await apiClient.get('/ai-config/settings/');
      return (res as any).data as { settings: AISettings };
    },
  });
}

export function useAIUsageStats(days: number = 30) {
  return useQuery({
    queryKey: keys.usage(days),
    queryFn: async (): Promise<UsageStats> => {
      const res = await apiClient.get(`/ai-config/usage_stats/?days=${days}`);
      return (res as any).data as UsageStats;
    },
  });
}

export function useAISystemStatus() {
  return useQuery({
    queryKey: keys.system,
    queryFn: async (): Promise<SystemStatus> => {
      const res = await apiClient.get('/ai-config/system_status/');
      return (res as any).data as SystemStatus;
    },
  });
}

export function useUpdateAISettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { settings: AISettings }) => {
      const res = await apiClient.post('/ai-config/update_settings/', payload);
      return (res as any).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.settings });
    },
  });
}

export function useTestAIConnectionMutation() {
  return useMutation({
    mutationFn: async (payload: { provider: 'openai' | 'ollama' | 'system' }) => {
      const res = await apiClient.post('/ai-config/test_connection/', payload);
      return (res as any).data as { success?: boolean; provider?: string; model?: string; processing_time?: number; error?: string };
    },
  });
}
