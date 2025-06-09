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
  isAdmin: () => boolean;
  accessToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const supabase: SupabaseClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAccessToken(session.access_token);
        setUser({
          id: session.user.id,
          name: session.user.email?.split('@')[0] || '',
          email: session.user.email || '',
          role: session.user.email?.includes('admin') ? 'admin' : 'user',
          department: 'Engineering',
          avatar: `https://ui-avatars.com/api/?name=${session.user.email?.split('@')[0]}&background=random`
        });
      }
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setAccessToken(session.access_token);
        setUser({
          id: session.user.id,
          name: session.user.email?.split('@')[0] || '',
          email: session.user.email || '',
          role: session.user.email?.includes('admin') ? 'admin' : 'user',
          department: 'Engineering',
          avatar: `https://ui-avatars.com/api/?name=${session.user.email?.split('@')[0]}&background=random`
        });
      } else {
        setUser(null);
        setAccessToken(null);
      }
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
      });

      if (error) throw error;

      if (data.session) {
        setAccessToken(data.session.access_token);
        setUser({
          id: data.session.user.id,
          name: data.session.user.email?.split('@')[0] || '',
          email: data.session.user.email || '',
          role: data.session.user.email?.includes('admin') ? 'admin' : 'user',
          department: 'Engineering',
          avatar: `https://ui-avatars.com/api/?name=${data.session.user.email?.split('@')[0]}&background=random`
        });
      }
    } catch (error) {
      console.error('Signup failed:', error);
      throw new Error('Signup failed. Please try again.');
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

      if (error) throw error;

      if (data.session) {
        setAccessToken(data.session.access_token);
        setUser({
          id: data.session.user.id,
          name: data.session.user.email?.split('@')[0] || '',
          email: data.session.user.email || '',
          role: data.session.user.email?.includes('admin') ? 'admin' : 'user',
          department: 'Engineering',
          avatar: `https://ui-avatars.com/api/?name=${data.session.user.email?.split('@')[0]}&background=random`
        });
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
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
        isAdmin,
        accessToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};