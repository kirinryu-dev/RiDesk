import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';

interface UserTag {
  tag_name: string;
  tag_value: string | null;
  granted_at: string;
  expires_at: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'moderator' | 'user';
  department: string;
  avatar_url?: string;
  bio?: string;
  expertise_level: string;
  github_username?: string;
  gitlab_username?: string;
  discord_username?: string;
  last_profile_change?: string;
  can_change_profile: boolean;
  permissions: string[];
  tags: UserTag[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
  isAdmin: () => boolean;
  isModerator: () => boolean;
  hasPermission: (permission: string) => boolean;
  hasTag: (tagName: string) => boolean;
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

// Cache for user data to avoid repeated fetches
let userCache: { [key: string]: { data: User; timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const OptimizedAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Optimized user profile fetch with caching
  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      // Check cache first
      const cached = userCache[userId];
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }

      console.log('Fetching fresh user profile for:', userId);
      
      // Single optimized query
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          user_tags!inner(tag_name, tag_value, granted_at, expires_at)
        `)
        .eq('id', userId)
        .eq('user_tags.is_active', true)
        .single();

      if (userError) {
        console.error('Error fetching user:', userError);
        return null;
      }

      if (!userData) {
        return null;
      }

      // Get permissions in a separate optimized query
      const { data: permissions } = await supabase
        .from('role_permissions')
        .select('permission_name')
        .eq('role', userData.role)
        .eq('is_active', true);

      const userProfile: User = {
        ...userData,
        can_change_profile: !userData.last_profile_change || 
          new Date(userData.last_profile_change) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        permissions: permissions?.map(p => p.permission_name) || [],
        tags: userData.user_tags || []
      };

      // Cache the result
      userCache[userId] = {
        data: userProfile,
        timestamp: Date.now()
      };

      return userProfile;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  // Lightweight user creation
  const createBasicUser = async (authUser: SupabaseUser): Promise<User> => {
    const userData = {
      id: authUser.id,
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
      email: authUser.email || '',
      role: 'user' as const,
      department: 'Engineering',
      avatar_url: authUser.user_metadata?.avatar_url || 
        `https://ui-avatars.com/api/?name=${authUser.email?.split('@')[0]}&background=random`,
      expertise_level: 'Rookie'
    };

    const { error } = await supabase
      .from('users')
      .insert(userData);

    if (error && !error.message.includes('duplicate key')) {
      throw error;
    }

    // Return basic profile without additional queries
    return {
      ...userData,
      can_change_profile: true,
      permissions: ['view_missions', 'create_missions', 'claim_missions'],
      tags: []
    };
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && mounted) {
          setAccessToken(session.access_token);
          
          let userProfile = await fetchUserProfile(session.user.id);
          
          if (!userProfile && mounted) {
            userProfile = await createBasicUser(session.user);
          }
          
          if (userProfile && mounted) {
            setUser(userProfile);
          }
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAccessToken(null);
        userCache = {}; // Clear cache on logout
        setIsLoading(false);
        return;
      }

      if (session) {
        setAccessToken(session.access_token);
        
        if (event === 'SIGNED_IN') {
          let userProfile = await fetchUserProfile(session.user.id);
          
          if (!userProfile) {
            userProfile = await createBasicUser(session.user);
          }
          
          if (userProfile) {
            setUser(userProfile);
          }
        }
      }
      
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          throw new Error('Invalid email or password. If you just signed up, please check your email for a confirmation link.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before signing in.');
        } else {
          throw new Error(error.message);
        }
      }
    } catch (error: any) {
      setIsLoading(false);
      throw error;
    }
  };

  const signup = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        } else {
          throw new Error(error.message);
        }
      }

      if (data.user && !data.session) {
        throw new Error('Account created! Please check your email for a confirmation link before signing in.');
      }
    } catch (error: any) {
      setIsLoading(false);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    if (!user || !accessToken) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
          last_profile_change: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // Clear cache and refresh
      delete userCache[user.id];
      const updatedProfile = await fetchUserProfile(user.id);
      if (updatedProfile) {
        setUser(updatedProfile);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update profile');
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
    }
    userCache = {}; // Clear cache
  };

  const isAdmin = () => user?.role === 'admin';
  const isModerator = () => user?.role === 'moderator' || user?.role === 'admin';
  const hasPermission = (permission: string) => user?.permissions?.includes(permission) || false;
  const hasTag = (tagName: string) => user?.tags?.some(tag => tag.tag_name === tagName) || false;

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
        updateProfile,
        isAdmin,
        isModerator,
        hasPermission,
        hasTag,
        accessToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};