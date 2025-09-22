import { useCallback, useMemo } from 'react';
import { useUrlStateObject, urlStateSerializers, type UrlStateValue } from './useUrlState';

export interface FilterConfig<T = any> {
  defaultValue?: T;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  transform?: (value: T) => any; // Transform for API
}

export interface FilterDefinition {
  [key: string]: FilterConfig;
}

export interface UseFiltersResult<T> {
  filters: T;
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  setFilters: (updates: Partial<T>) => void;
  clearFilter: (key: keyof T) => void;
  clearAllFilters: () => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  getApiParams: () => Record<string, any>;
}

/**
 * Hook for managing filter state with URL synchronization
 */
export function useFilters<T extends Record<string, UrlStateValue>>(
  definition: FilterDefinition
): UseFiltersResult<T> {
  // Convert definition to URL state config
  const stateConfig = useMemo(() => {
    const config: Record<string, any> = {};

    for (const [key, filterConfig] of Object.entries(definition)) {
      config[key] = {
        defaultValue: filterConfig.defaultValue,
        serialize: filterConfig.serialize,
        deserialize: filterConfig.deserialize
      };
    }

    return config;
  }, [definition]);

  const [filters, setFiltersState] = useUrlStateObject<T>(stateConfig);

  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFiltersState({ [key]: value } as Partial<T>);
  }, [setFiltersState]);

  const setFilters = useCallback((updates: Partial<T>) => {
    setFiltersState(updates);
  }, [setFiltersState]);

  const clearFilter = useCallback((key: keyof T) => {
    const defaultValue = definition[key as string]?.defaultValue;
    setFiltersState({ [key]: defaultValue } as Partial<T>);
  }, [definition, setFiltersState]);

  const clearAllFilters = useCallback(() => {
    const resetValues: Partial<T> = {};
    for (const [key, config] of Object.entries(definition)) {
      resetValues[key as keyof T] = config.defaultValue as T[keyof T];
    }
    setFiltersState(resetValues);
  }, [definition, setFiltersState]);

  const resetFilters = clearAllFilters;

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      const defaultValue = definition[key]?.defaultValue;
      return value !== defaultValue && value !== undefined && value !== null && value !== '';
    });
  }, [filters, definition]);

  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      const defaultValue = definition[key]?.defaultValue;
      return value !== defaultValue && value !== undefined && value !== null && value !== '';
    }).length;
  }, [filters, definition]);

  const getApiParams = useCallback(() => {
    const params: Record<string, any> = {};

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        const config = definition[key];
        if (config?.transform) {
          const transformed = config.transform(value);
          if (transformed !== undefined && transformed !== null) {
            params[key] = transformed;
          }
        } else {
          params[key] = value;
        }
      }
    }

    return params;
  }, [filters, definition]);

  return {
    filters,
    setFilter,
    setFilters,
    clearFilter,
    clearAllFilters,
    resetFilters,
    hasActiveFilters,
    activeFilterCount,
    getApiParams
  };
}

/**
 * Pre-configured filter definitions for common use cases
 */
export const commonFilters = {
  search: {
    defaultValue: '',
    serialize: (value: string) => value,
    deserialize: (value: string) => value
  },

  dateRange: {
    start_date: {
      defaultValue: undefined,
      ...urlStateSerializers.date
    },
    end_date: {
      defaultValue: undefined,
      ...urlStateSerializers.date
    }
  },

  amount: {
    min_amount: {
      defaultValue: undefined,
      ...urlStateSerializers.number,
      transform: (value: number) => value > 0 ? value : undefined
    },
    max_amount: {
      defaultValue: undefined,
      ...urlStateSerializers.number,
      transform: (value: number) => value > 0 ? value : undefined
    }
  },

  multiSelect: (defaultValue: string[] = []) => ({
    defaultValue,
    ...urlStateSerializers.array
  }),

  multiSelectNumbers: (defaultValue: number[] = []) => ({
    defaultValue,
    ...urlStateSerializers.numberArray
  }),

  boolean: (defaultValue?: boolean) => ({
    defaultValue,
    ...urlStateSerializers.boolean
  }),

  select: (defaultValue?: string) => ({
    defaultValue,
    serialize: (value: string) => value || '',
    deserialize: (value: string) => value || undefined
  })
};

/**
 * Specialized hook for transaction filters
 */
export function useTransactionFilters() {
  return useFilters({
    search: commonFilters.search,
    account_ids: commonFilters.multiSelectNumbers(),
    category_ids: commonFilters.multiSelect(),
    start_date: commonFilters.dateRange.start_date,
    end_date: commonFilters.dateRange.end_date,
    min_amount: commonFilters.amount.min_amount,
    max_amount: commonFilters.amount.max_amount,
    transaction_type: commonFilters.select(),
    verified: commonFilters.boolean(),
    tags: commonFilters.multiSelect(),
    ordering: {
      defaultValue: '-date',
      serialize: (value: string) => value,
      deserialize: (value: string) => value
    }
  });
}