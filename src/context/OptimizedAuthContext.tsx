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

  // Test auth connection and RLS
  const testAuthConnection = async () => {
    try {
      console.log('🔍 Testing auth connection...');
      
      const { data, error } = await supabase.rpc('test_auth_connection');
      
      if (error) {
        console.error('❌ Auth connection test failed:', error);
        return false;
      }
      
      console.log('✅ Auth connection test result:', data);
      return data?.is_authenticated || false;
    } catch (error) {
      console.error('❌ Auth connection test error:', error);
      return false;
    }
  };

  // Safe user profile fetch with error handling
  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      // Check cache first
      const cached = userCache[userId];
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('📦 Using cached user profile');
        return cached.data;
      }

      console.log('🔄 Fetching user profile for:', userId);
      
      // Use the safe auth operation function
      const { data, error } = await supabase.rpc('safe_auth_operation', {
        operation_type: 'get_user'
      });

      if (error) {
        console.error('❌ Error fetching user profile:', error);
        return null;
      }

      if (data?.error) {
        console.error('❌ User profile fetch error:', data.error);
        return null;
      }

      if (!data?.profile) {
        console.log('⚠️ No user profile found');
        return null;
      }

      const userProfile: User = {
        ...data.profile,
        permissions: data.permissions || [],
        tags: data.tags || []
      };

      // Cache the result
      userCache[userId] = {
        data: userProfile,
        timestamp: Date.now()
      };

      console.log('✅ User profile fetched successfully:', userProfile.name);
      return userProfile;
    } catch (error) {
      console.error('❌ Error in fetchUserProfile:', error);
      return null;
    }
  };

  // Lightweight user creation with error handling
  const createBasicUser = async (authUser: SupabaseUser): Promise<User | null> => {
    try {
      console.log('👤 Creating basic user profile for:', authUser.email);
      
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

      if (error) {
        if (error.message.includes('duplicate key')) {
          console.log('ℹ️ User already exists, fetching existing profile');
          return await fetchUserProfile(authUser.id);
        } else {
          console.error('❌ Error creating user:', error);
          throw error;
        }
      }

      // Return basic profile
      const basicProfile: User = {
        ...userData,
        can_change_profile: true,
        permissions: ['view_missions', 'create_missions', 'claim_missions'],
        tags: []
      };

      console.log('✅ Basic user created successfully');
      return basicProfile;
    } catch (error) {
      console.error('❌ Error creating basic user:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('🚀 Initializing auth...');
        
        // Test auth connection first
        const authWorking = await testAuthConnection();
        if (!authWorking) {
          console.warn('⚠️ Auth connection test failed, but continuing...');
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          return;
        }
        
        if (session && mounted) {
          console.log('🔑 Session found, setting up user...');
          setAccessToken(session.access_token);
          
          let userProfile = await fetchUserProfile(session.user.id);
          
          if (!userProfile && mounted) {
            console.log('👤 No profile found, creating basic user...');
            userProfile = await createBasicUser(session.user);
          }
          
          if (userProfile && mounted) {
            setUser(userProfile);
            console.log('✅ User setup complete');
          } else {
            console.warn('⚠️ Failed to set up user profile');
          }
        } else {
          console.log('ℹ️ No active session found');
        }
      } catch (error) {
        console.error('❌ Auth init error:', error);
      } finally {
        if (mounted) {
          console.log('🏁 Auth initialization complete');
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('🔄 Auth event:', event);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAccessToken(null);
        userCache = {}; // Clear cache on logout
        setIsLoading(false);
        console.log('👋 User signed out');
        return;
      }

      if (session) {
        setAccessToken(session.access_token);
        
        if (event === 'SIGNED_IN') {
          console.log('🔑 User signed in, fetching profile...');
          
          let userProfile = await fetchUserProfile(session.user.id);
          
          if (!userProfile) {
            console.log('👤 Creating new user profile...');
            userProfile = await createBasicUser(session.user);
          }
          
          if (userProfile) {
            setUser(userProfile);
            console.log('✅ Sign in complete');
          } else {
            console.error('❌ Failed to set up user after sign in');
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
    console.log('🔐 Starting login for:', email);
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Login error:', error);
        
        // Provide more specific error messages
        if (error.message === 'Invalid login credentials') {
          throw new Error('Invalid email or password. If you just signed up, please check your email for a confirmation link.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before signing in.');
        } else if (error.message.includes('signup_disabled')) {
          throw new Error('New signups are currently disabled. Please contact support.');
        } else {
          throw new Error(error.message);
        }
      }

      console.log('✅ Login successful');
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const signup = async (email: string, password: string) => {
    console.log('📝 Starting signup for:', email);
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        console.error('❌ Signup error:', error);
        
        if (error.message.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        } else if (error.message.includes('signup_disabled')) {
          throw new Error('New signups are currently disabled. Please contact support.');
        } else {
          throw new Error(error.message);
        }
      }

      if (data.user && !data.session) {
        throw new Error('Account created! Please check your email for a confirmation link before signing in.');
      }

      console.log('✅ Signup successful');
    } catch (error: any) {
      console.error('❌ Signup failed:', error);
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
    console.log('👋 Logging out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ Logout error:', error);
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