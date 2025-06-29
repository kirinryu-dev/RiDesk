import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface QueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  cacheKey?: string;
}

interface QueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Simple in-memory cache
const queryCache = new Map<string, { data: any; timestamp: number; staleTime: number }>();

export function useOptimizedQuery<T>(
  queryFn: () => Promise<T>,
  dependencies: any[] = [],
  options: QueryOptions = {}
): QueryResult<T> {
  const {
    enabled = true,
    refetchInterval,
    staleTime = 5 * 60 * 1000, // 5 minutes default
    cacheKey
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const executeQuery = useCallback(async (useCache = true) => {
    if (!enabled) return;

    // Check cache first
    if (useCache && cacheKey) {
      const cached = queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.staleTime) {
        setData(cached.data);
        setIsLoading(false);
        return;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      
      // Cache the result
      if (cacheKey) {
        queryCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          staleTime
        });
      }

      setData(result);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Query error:', err);
        setError(err.message || 'An error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, queryFn, cacheKey, staleTime]);

  const refetch = useCallback(() => executeQuery(false), [executeQuery]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery, ...dependencies]);

  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(() => {
        executeQuery();
      }, refetchInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refetchInterval, enabled, executeQuery]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { data, isLoading, error, refetch };
}

// Optimized mission queries
export const useMissions = (filters: { level?: string; search?: string } = {}) => {
  return useOptimizedQuery(
    async () => {
      let query = supabase
        .from('missions')
        .select('id, title, description, level, tags, estimated_hours, reward, status, created_at')
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .limit(50); // Limit results for better performance

      if (filters.level) {
        query = query.eq('level', filters.level);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%, tags.cs.{${filters.search}}`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    [filters.level, filters.search],
    {
      cacheKey: `missions-${JSON.stringify(filters)}`,
      staleTime: 2 * 60 * 1000, // 2 minutes for missions
    }
  );
};

// Optimized user stats
export const useUserStats = (userId?: string) => {
  return useOptimizedQuery(
    async () => {
      if (!userId) return null;

      // Use a single optimized query instead of multiple queries
      const { data, error } = await supabase.rpc('get_user_stats_optimized', {
        user_id: userId
      });

      if (error) throw error;
      return data;
    },
    [userId],
    {
      enabled: !!userId,
      cacheKey: `user-stats-${userId}`,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

// Optimized platform stats
export const usePlatformStats = () => {
  return useOptimizedQuery(
    async () => {
      const { data, error } = await supabase.rpc('get_platform_stats_optimized');
      if (error) throw error;
      return data;
    },
    [],
    {
      cacheKey: 'platform-stats',
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 60 * 1000, // Refresh every minute
    }
  );
};