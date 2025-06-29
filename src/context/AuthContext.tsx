import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  department: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAdmin: () => boolean;
  accessToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
      }
      
      if (session) {
        setAccessToken(session.access_token);
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          role: session.user.email?.includes('admin') ? 'admin' : 'user',
          department: 'Engineering',
          avatar: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session.user.email?.split('@')[0]}&background=random`
        });
      }
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      
      if (session) {
        setAccessToken(session.access_token);
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          role: session.user.email?.includes('admin') ? 'admin' : 'user',
          department: 'Engineering',
          avatar: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session.user.email?.split('@')[0]}&background=random`
        });
      } else {
        setUser(null);
        setAccessToken(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signup = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        console.error('Signup error:', error);
        throw new Error(error.message || 'Signup failed');
      }

      // Check if user needs to confirm email
      if (data.user && !data.session) {
        throw new Error('Please check your email to confirm your account before signing in.');
      }

      if (data.session) {
        setAccessToken(data.session.access_token);
        setUser({
          id: data.session.user.id,
          name: data.session.user.user_metadata?.name || data.session.user.email?.split('@')[0] || 'User',
          email: data.session.user.email || '',
          role: data.session.user.email?.includes('admin') ? 'admin' : 'user',
          department: 'Engineering',
          avatar: data.session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${data.session.user.email?.split('@')[0]}&background=random`
        });
      }
    } catch (error: any) {
      console.error('Signup failed:', error);
      throw new Error(error.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        throw new Error(error.message || 'Login failed');
      }

      if (data.session) {
        setAccessToken(data.session.access_token);
        setUser({
          id: data.session.user.id,
          name: data.session.user.user_metadata?.name || data.session.user.email?.split('@')[0] || 'User',
          email: data.session.user.email || '',
          role: data.session.user.email?.includes('admin') ? 'admin' : 'user',
          department: 'Engineering',
          avatar: data.session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${data.session.user.email?.split('@')[0]}&background=random`
        });
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      clearTimeout(timeoutId);

      if (error) {
        console.error('Password reset error:', error);
        // Provide more specific error messages
        if (error.message.includes('rate limit')) {
          throw new Error('Too many reset attempts. Please wait a few minutes before trying again.');
        } else if (error.message.includes('invalid email')) {
          throw new Error('Please enter a valid email address.');
        } else {
          throw new Error(error.message || 'Failed to send reset email');
        }
      }
    } catch (error: any) {
      console.error('Password reset failed:', error);
      
      // Handle network errors specifically
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your internet connection and try again.');
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      } else {
        throw new Error(error.message || 'Failed to send reset email. Please try again.');
      }
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    setAccessToken(null);
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        resetPassword,
        isAdmin,
        accessToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};