import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { databaseService, User } from '@/services/database'
import { webSocketService } from '@/services/websocket'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{user: User | null, error: string | null}>
  signUp: (email: string, password: string, name: string, profileImage?: string) => Promise<{user: User | null, error: string | null}>
  signOut: () => Promise<{error: string | null}>
  updateProfile: (updates: Partial<User>) => Promise<{user: User | null, error: string | null}>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a DatabaseAuthProvider')
  }
  return context
}

interface DatabaseAuthProviderProps {
  children: ReactNode
}

export function DatabaseAuthProvider({ children }: DatabaseAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial user state
    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing authentication...')
        const { user: currentUser, error } = await databaseService.getCurrentUser()
        
        if (error) {
          console.error('Error getting current user:', error)
        } else if (currentUser) {
          console.log('👤 User authenticated:', currentUser.email)
          setUser(currentUser)
          
          // Initialize WebSocket connection for authenticated user
          webSocketService.initializeConnection(currentUser.id)
        } else {
          console.log('👤 No authenticated user found')
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Cleanup WebSocket on unmount
    return () => {
      webSocketService.disconnect()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { user: authenticatedUser, error } = await databaseService.signIn(email, password)
      
      if (error) {
        return { user: null, error }
      }

      if (authenticatedUser) {
        console.log('👤 User signed in:', authenticatedUser.email)
        setUser(authenticatedUser)
        
        // Initialize WebSocket connection
        webSocketService.initializeConnection(authenticatedUser.id)
        
        return { user: authenticatedUser, error: null }
      }

      return { user: null, error: 'Authentication failed' }
    } catch (error: any) {
      const errorMessage = error?.message || 'Sign in failed'
      console.error('Sign in error:', errorMessage)
      return { user: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, name: string, profileImage?: string) => {
    try {
      setLoading(true)
      const { user: newUser, error } = await databaseService.createUser({
        email,
        password,
        name,
        profileImage,
      })
      
      if (error) {
        return { user: null, error }
      }

      if (newUser) {
        console.log('👤 User created:', newUser.email)
        setUser(newUser)
        
        // Initialize WebSocket connection
        webSocketService.initializeConnection(newUser.id)
        
        return { user: newUser, error: null }
      }

      return { user: null, error: 'User creation failed' }
    } catch (error: any) {
      const errorMessage = error?.message || 'Sign up failed'
      console.error('Sign up error:', errorMessage)
      return { user: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      const { error } = await databaseService.signOut()
      
      if (error) {
        return { error }
      }

      console.log('👤 User signed out')
      setUser(null)
      
      // Disconnect WebSocket
      webSocketService.disconnect()
      
      return { error: null }
    } catch (error: any) {
      const errorMessage = error?.message || 'Sign out failed'
      console.error('Sign out error:', errorMessage)
      return { error: errorMessage }
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) {
      return { user: null, error: 'No user logged in' }
    }

    try {
      const { user: updatedUser, error } = await databaseService.updateProfile(user.id, updates)
      
      if (error) {
        return { user: null, error }
      }

      if (updatedUser) {
        console.log('👤 Profile updated:', updatedUser.email)
        setUser(updatedUser)
        return { user: updatedUser, error: null }
      }

      return { user: null, error: 'Profile update failed' }
    } catch (error: any) {
      const errorMessage = error?.message || 'Profile update failed'
      console.error('Profile update error:', errorMessage)
      return { user: null, error: errorMessage }
    }
  }

  const refreshUser = async () => {
    if (!user) return

    try {
      const { user: refreshedUser, error } = await databaseService.getCurrentUser()
      
      if (error) {
        console.error('Error refreshing user:', error)
      } else if (refreshedUser) {
        setUser(refreshedUser)
        console.log('👤 User data refreshed')
      }
    } catch (error) {
      console.error('User refresh error:', error)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Helper components for conditional rendering
export function AuthenticatedOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }
  
  return user ? <>{children}</> : null
}

export function UnauthenticatedOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }
  
  return !user ? <>{children}</> : null
}
