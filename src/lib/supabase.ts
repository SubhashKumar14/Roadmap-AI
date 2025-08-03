import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('🔧 Supabase Config Check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlLength: supabaseUrl?.length,
  keyLength: supabaseAnonKey?.length
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables:', {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'Present' : 'Missing'
  });
  // Don't throw error, create a fallback client
}

// Create Supabase client with fallback for development
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)

// Auth helper functions
export const authService = {
  // Sign up with email and password
  signUp: async (email: string, password: string, userData?: any) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️ Supabase not configured, using demo mode');
      return { 
        data: { user: { email, id: 'demo-user' } }, 
        error: null 
      };
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData // Additional user metadata
      }
    })
    return { data, error }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️ Supabase not configured, using demo mode');
      return { 
        data: { user: { email, id: 'demo-user' } }, 
        error: null 
      };
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Sign in with OAuth providers
  signInWithProvider: async (provider: 'google' | 'github' | 'discord') => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️ Supabase not configured, OAuth unavailable');
      return { 
        data: null, 
        error: { message: 'OAuth not available in demo mode' } 
      };
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin
      }
    })
    return { data, error }
  },

  // Sign out
  signOut: async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️ Supabase not configured, demo sign out');
      return { error: null };
    }
    
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current session
  getSession: async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return { data: { session: null }, error: null };
    }
    
    const { data, error } = await supabase.auth.getSession()
    return { data, error }
  },

  // Get current user
  getUser: async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return { data: { user: null }, error: null };
    }
    
    const { data, error } = await supabase.auth.getUser()
    return { data, error }
  },

  // Update user profile
  updateProfile: async (updates: any) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️ Supabase not configured, profile update unavailable');
      return { data: updates, error: null };
    }
    
    const { data, error } = await supabase.auth.updateUser({
      data: updates
    })
    return { data, error }
  },

  // Reset password
  resetPassword: async (email: string) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️ Supabase not configured, password reset unavailable');
      return { data: null, error: { message: 'Password reset not available in demo mode' } };
    }
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    return { data, error }
  }
}
