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

  const fetchUserProfile = async (userId: string, token: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_profile', { user_uuid: userId });

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      if (data?.profile) {
        return {
          ...data.profile,
          permissions: data.permissions || [],
          tags: data.tags || []
        };
      }

      return null;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  const createUserProfile = async (authUser: SupabaseUser) => {
    try {
      const { error } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          role: authUser.email?.includes('admin') ? 'admin' : 'user',
          department: 'Engineering',
          avatar_url: authUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${authUser.email?.split('@')[0]}&background=random`,
          expertise_level: 'Rookie'
        });

      if (error && !error.message.includes('duplicate key')) {
        console.error('Error creating user profile:', error);
        throw error;
      }

      return await fetchUserProfile(authUser.id, '');
    } catch (error) {
      console.error('Error in createUserProfile:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
      }
      
      if (session) {
        setAccessToken(session.access_token);
        
        let userProfile = await fetchUserProfile(session.user.id, session.access_token);
        
        // If no profile exists, create one
        if (!userProfile) {
          userProfile = await createUserProfile(session.user);
        }
        
        setUser(userProfile);
      }
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      
      if (session) {
        setAccessToken(session.access_token);
        
        let userProfile = await fetchUserProfile(session.user.id, session.access_token);
        
        // If no profile exists, create one
        if (!userProfile) {
          userProfile = await createUserProfile(session.user);
        }
        
        setUser(userProfile);
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
        
        let userProfile = await fetchUserProfile(data.session.user.id, data.session.access_token);
        
        // If no profile exists, create one
        if (!userProfile) {
          userProfile = await createUserProfile(data.session.user);
        }
        
        setUser(userProfile);
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
        
        let userProfile = await fetchUserProfile(data.session.user.id, data.session.access_token);
        
        // If no profile exists, create one
        if (!userProfile) {
          userProfile = await createUserProfile(data.session.user);
        }
        
        setUser(userProfile);
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      clearTimeout(timeoutId);

      if (error) {
        console.error('Password reset error:', error);
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
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your internet connection and try again.');
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      } else {
        throw new Error(error.message || 'Failed to send reset email. Please try again.');
      }
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
      const updatedProfile = await fetchUserProfile(user.id, accessToken);
      if (updatedProfile) {
        setUser(updatedProfile);
      }
    } catch (error: any) {
      console.error('Profile update failed:', error);
      throw new Error(error.message || 'Failed to update profile');
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

  const isModerator = () => {
    return user?.role === 'moderator' || user?.role === 'admin';
  };

  const hasPermission = (permission: string) => {
    return user?.permissions?.includes(permission) || false;
  };

  const hasTag = (tagName: string) => {
    return user?.tags?.some(tag => tag.tag_name === tagName) || false;
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