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

// Simple in-memory cache with size limit
const MAX_CACHE_SIZE = 100;
const queryCache = new Map<string, { data: any; timestamp: number; staleTime: number }>();

// Cache cleanup function
const cleanupCache = () => {
  if (queryCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(queryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20% of entries
    const toRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
    for (let i = 0; i < toRemove; i++) {
      queryCache.delete(entries[i][0]);
    }
  }
};

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
        cleanupCache();
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

// Optimized mission queries using the new database functions
export const useMissions = (filters: { level?: string; search?: string } = {}) => {
  return useOptimizedQuery(
    async () => {
      try {
        // Use the optimized search function from the database
        const { data, error } = await supabase.rpc('search_missions_optimized', {
          search_term: filters.search || null,
          level_filter: filters.level || null,
          limit_count: 50
        });
        
        if (error) {
          console.error('Missions query error:', error);
          throw error;
        }
        
        return data || [];
      } catch (error) {
        console.error('Error in useMissions:', error);
        
        // Fallback to direct query if RPC fails
        try {
          let query = supabase
            .from('missions')
            .select('id, title, description, level, tags, estimated_hours, reward, status, created_at')
            .eq('status', 'available')
            .order('created_at', { ascending: false })
            .limit(50);

          if (filters.level) {
            query = query.eq('level', filters.level);
          }

          if (filters.search) {
            query = query.ilike('title', `%${filters.search}%`);
          }

          const { data: fallbackData, error: fallbackError } = await query;
          
          if (fallbackError) throw fallbackError;
          return fallbackData || [];
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          throw fallbackError;
        }
      }
    },
    [filters.level, filters.search],
    {
      cacheKey: `missions-${JSON.stringify(filters)}`,
      staleTime: 2 * 60 * 1000, // 2 minutes for missions
    }
  );
};

// Optimized user missions query
export const useUserMissions = (userId?: string) => {
  return useOptimizedQuery(
    async () => {
      if (!userId) return [];

      try {
        const { data, error } = await supabase.rpc('get_user_missions_optimized', {
          user_uuid: userId
        });

        if (error) {
          console.error('User missions error:', error);
          throw error;
        }

        return data || [];
      } catch (error) {
        console.error('Error in useUserMissions:', error);
        
        // Fallback to direct query
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('missions')
            .select('id, title, description, level, status, reward, estimated_hours, created_at')
            .eq('created_by', userId)
            .order('created_at', { ascending: false })
            .limit(50);

          if (fallbackError) throw fallbackError;
          return fallbackData || [];
        } catch (fallbackError) {
          console.error('Fallback user missions query failed:', fallbackError);
          return [];
        }
      }
    },
    [userId],
    {
      enabled: !!userId,
      cacheKey: `user-missions-${userId}`,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

// Optimized user stats using the new safe function
export const useUserStats = (userId?: string) => {
  return useOptimizedQuery(
    async () => {
      if (!userId) return null;

      try {
        const { data, error } = await supabase.rpc('get_user_stats_optimized', {
          user_id: userId
        });

        if (error) {
          console.error('User stats error:', error);
          throw error;
        }

        return data;
      } catch (error) {
        console.error('Error in useUserStats:', error);
        // Return default values on error
        return {
          created_missions: 0,
          completed_missions: 0
        };
      }
    },
    [userId],
    {
      enabled: !!userId,
      cacheKey: `user-stats-${userId}`,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

// Optimized platform stats using the new safe function
export const usePlatformStats = () => {
  return useOptimizedQuery(
    async () => {
      try {
        const { data, error } = await supabase.rpc('get_platform_stats_optimized');
        
        if (error) {
          console.error('Platform stats error:', error);
          throw error;
        }
        
        return data;
      } catch (error) {
        console.error('Error in usePlatformStats:', error);
        // Return default values on error
        return {
          total_users: 0,
          online_users: 0,
          available_missions: 0
        };
      }
    },
    [],
    {
      cacheKey: 'platform-stats',
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 60 * 1000, // Refresh every minute
    }
  );
};

// Database performance monitoring hook
export const useDatabasePerformance = () => {
  return useOptimizedQuery(
    async () => {
      try {
        const { data, error } = await supabase.rpc('get_index_report');
        
        if (error) {
          console.error('Database performance error:', error);
          throw error;
        }
        
        return data;
      } catch (error) {
        console.error('Error in useDatabasePerformance:', error);
        return null;
      }
    },
    [],
    {
      cacheKey: 'database-performance',
      staleTime: 10 * 60 * 1000, // 10 minutes
      enabled: false // Only enable when explicitly requested
    }
  );
};