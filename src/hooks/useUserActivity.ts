import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../context/OptimizedAuthContext';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const useUserActivity = () => {
  const { user, accessToken } = useAuth();

  useEffect(() => {
    if (!user || !accessToken) return;

    // Update user activity immediately
    const updateActivity = async () => {
      try {
        await supabase.rpc('update_user_last_seen');
      } catch (error) {
        console.error('Error updating user activity:', error);
      }
    };

    // Update activity on mount
    updateActivity();

    // Set up interval to update activity every 2 minutes
    const interval = setInterval(updateActivity, 2 * 60 * 1000);

    // Update activity on page visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateActivity();
      }
    };

    // Update activity on user interaction
    const handleUserInteraction = () => {
      updateActivity();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousedown', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('scroll', handleUserInteraction);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousedown', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('scroll', handleUserInteraction);
    };
  }, [user, accessToken]);
};