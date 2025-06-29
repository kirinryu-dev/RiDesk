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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Simple direct query instead of RPC for better performance
  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      // Direct query to users table - much faster than RPC
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user:', userError);
        return null;
      }

      if (!userData) {
        console.log('No user data found');
        return null;
      }

      // Get permissions for the user's role
      const { data: permissions } = await supabase
        .from('role_permissions')
        .select('permission_name')
        .eq('role', userData.role)
        .eq('is_active', true);

      // Get user tags
      const { data: tags } = await supabase
        .from('user_tags')
        .select('tag_name, tag_value, granted_at, expires_at')
        .eq('user_id', userId)
        .eq('is_active', true);

      const userProfile: User = {
        ...userData,
        can_change_profile: !userData.last_profile_change || 
          new Date(userData.last_profile_change) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        permissions: permissions?.map(p => p.permission_name) || [],
        tags: tags || []
      };

      console.log('Profile fetched successfully:', userProfile.name);
      return userProfile;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  const createBasicUser = async (authUser: SupabaseUser) => {
    try {
      console.log('Creating basic user profile for:', authUser.email);
      
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
        console.error('Error creating user:', error);
        throw error;
      }

      // Return basic user profile without additional queries
      return {
        ...userData,
        can_change_profile: true,
        permissions: ['view_missions', 'create_missions', 'claim_missions'],
        tags: []
      };
    } catch (error) {
      console.error('Error creating basic user:', error);
      throw error;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && mounted) {
          console.log('Session found, setting up user...');
          setAccessToken(session.access_token);
          
          // Try to get user profile quickly
          let userProfile = await fetchUserProfile(session.user.id);
          
          if (!userProfile && mounted) {
            console.log('No profile found, creating basic user...');
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
          console.log('Auth initialization complete');
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth event:', event);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAccessToken(null);
        setIsLoading(false);
        return;
      }

      if (session) {
        setAccessToken(session.access_token);
        
        if (event === 'SIGNED_IN') {
          // For sign in, get user profile
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
    console.log('Starting login for:', email);
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        throw new Error(error.message);
      }

      console.log('Login successful');
    } catch (error: any) {
      console.error('Login failed:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const signup = async (email: string, password: string) => {
    console.log('Starting signup for:', email);
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        console.error('Signup error:', error);
        throw new Error(error.message);
      }

      if (data.user && !data.session) {
        throw new Error('Please check your email to confirm your account.');
      }

      console.log('Signup successful');
    } catch (error: any) {
      console.error('Signup failed:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error: any) {
      throw error;
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

      // Refresh user profile
      const updatedProfile = await fetchUserProfile(user.id);
      if (updatedProfile) {
        setUser(updatedProfile);
      }
    } catch (error: any) {
      console.error('Profile update failed:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  };

  const logout = async () => {
    console.log('Logging out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
    }
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