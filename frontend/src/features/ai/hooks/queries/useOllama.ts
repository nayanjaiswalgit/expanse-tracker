import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../api';

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details: Record<string, any>;
  family: string;
  parameters: string;
  capabilities: string[];
  recommended_use: string;
}

export interface SystemInfo {
  available: boolean;
  endpoint: string;
  models_count: number;
  total_storage_used: number;
  models: OllamaModel[];
  server_info: { version: string; status: string };
}

export interface RecommendedModel {
  name: string;
  description: string;
  use_case: string;
  size: string;
  recommended_for: string;
}

const keys = {
  status: ['ollama', 'status'] as const,
  models: (refresh: boolean) => ['ollama', 'models', refresh] as const,
  recommended: ['ollama', 'recommended'] as const,
};

export function useOllamaStatus() {
  return useQuery({
    queryKey: keys.status,
    queryFn: async (): Promise<{ system_info: SystemInfo }> => {
      const res = await apiClient.get('/ollama/status/');
      return (res as any).data as { system_info: SystemInfo };
    },
    staleTime: 30 * 1000,
  });
}

export function useOllamaModels(refresh: boolean = true) {
  return useQuery({
    queryKey: keys.models(refresh),
    queryFn: async (): Promise<{ models: OllamaModel[] }> => {
      const res = await apiClient.get(`/ollama/models/?refresh=${refresh ? 'true' : 'false'}`);
      return (res as any).data as { models: OllamaModel[] };
    },
  });
}

export function useOllamaRecommended() {
  return useQuery({
    queryKey: keys.recommended,
    queryFn: async (): Promise<{ recommended_models: RecommendedModel[] }> => {
      const res = await apiClient.get('/ollama/recommended/');
      return (res as any).data as { recommended_models: RecommendedModel[] };
    },
  });
}

export function usePullModelMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (modelName: string) => {
      const res = await apiClient.post(`/ollama/${encodeURIComponent(modelName)}/pull/`, {});
      return (res as any).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.models(true) });
    },
  });
}

export function useRemoveModelMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (modelName: string) => {
      const res = await apiClient.delete(`/ollama/${encodeURIComponent(modelName)}/remove/`);
      return (res as any).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.models(true) });
    },
  });
}

export function useTestModelMutation() {
  return useMutation({
    mutationFn: async (args: { modelName: string; prompt: string }) => {
      const res = await apiClient.post(`/ollama/${encodeURIComponent(args.modelName)}/test/`, { prompt: args.prompt });
      return (res as any).data as { success?: boolean; response?: string; processing_time?: number; error?: string };
    },
  });
}
