import React, { createContext, useContext, useEffect, useState } from 'react'
import { databaseService } from '../../services/database.js'
import { webSocketService } from '../../services/websocket.js'

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {string} [profileImage]
 * @property {string} [bio]
 * @property {string} [location]
 * @property {string} [githubUsername]
 * @property {string} [twitterUsername]
 * @property {string[]} [learningGoals]
 * @property {Object} stats
 * @property {Object} preferences
 * @property {string} sessionToken
 * @property {string} sessionExpiry
 */

/**
 * @typedef {Object} AuthContextType
 * @property {User|null} user
 * @property {boolean} loading
 * @property {function} signIn
 * @property {function} signUp
 * @property {function} signOut
 * @property {function} updateProfile
 * @property {function} refreshUser
 */

const AuthContext = createContext(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a DatabaseAuthProvider')
  }
  return context
}

export function DatabaseAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial user state and validate session
    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing authentication with 24-hour session validation...')
        const { user: currentUser, error } = await databaseService.getCurrentUser()
        
        if (error) {
          console.error('Error getting current user:', error)
        } else if (currentUser) {
          console.log('👤 User authenticated with session:', currentUser.email)
          setUser(currentUser)
          
          // Initialize WebSocket connection for authenticated user
          webSocketService.initializeConnection(currentUser.id)
          
          // Log session info
          console.log('⏰ Session expires at:', new Date(currentUser.sessionExpiry).toLocaleString())
        } else {
          console.log('👤 No authenticated user found or session expired')
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Set up session validation interval (check every 30 minutes)
    const sessionCheckInterval = setInterval(async () => {
      const sessionToken = localStorage.getItem('ai-roadmap-session')
      if (sessionToken) {
        const validation = await databaseService.validateSession(sessionToken)
        if (!validation.valid) {
          console.log('Session expired, signing out user')
          setUser(null)
          localStorage.removeItem('ai-roadmap-user')
          localStorage.removeItem('ai-roadmap-session')
          webSocketService.disconnect()
        }
      }
    }, 30 * 60 * 1000) // 30 minutes

    // Cleanup on unmount
    return () => {
      clearInterval(sessionCheckInterval)
      webSocketService.disconnect()
    }
  }, [])

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      const { user: authenticatedUser, error } = await databaseService.signIn(email, password)
      
      if (error) {
        return { user: null, error }
      }

      if (authenticatedUser) {
        console.log('👤 User signed in with 24-hour session:', authenticatedUser.email)
        console.log('⏰ Session expires at:', new Date(authenticatedUser.sessionExpiry).toLocaleString())
        setUser(authenticatedUser)
        
        // Initialize WebSocket connection
        webSocketService.initializeConnection(authenticatedUser.id)
        
        return { user: authenticatedUser, error: null }
      }

      return { user: null, error: 'Authentication failed' }
    } catch (error) {
      const errorMessage = error?.message || 'Sign in failed'
      console.error('Sign in error:', errorMessage)
      return { user: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email, password, name, profileImage) => {
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
        console.log('👤 User created with 24-hour session:', newUser.email)
        console.log('⏰ Session expires at:', new Date(newUser.sessionExpiry).toLocaleString())
        setUser(newUser)
        
        // Initialize WebSocket connection
        webSocketService.initializeConnection(newUser.id)
        
        return { user: newUser, error: null }
      }

      return { user: null, error: 'User creation failed' }
    } catch (error) {
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

      console.log('👤 User signed out and session invalidated')
      setUser(null)
      
      // Disconnect WebSocket
      webSocketService.disconnect()
      
      return { error: null }
    } catch (error) {
      const errorMessage = error?.message || 'Sign out failed'
      console.error('Sign out error:', errorMessage)
      return { error: errorMessage }
    }
  }

  const updateProfile = async (updates) => {
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
    } catch (error) {
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

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshUser,
  }

  return React.createElement(AuthContext.Provider, { value }, children)
}

// Helper components for conditional rendering
export function AuthenticatedOnly({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return React.createElement('div', {
      className: "min-h-screen flex items-center justify-center"
    }, React.createElement('div', {
      className: "animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
    }))
  }
  
  return user ? children : null
}

export function UnauthenticatedOnly({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return React.createElement('div', {
      className: "min-h-screen flex items-center justify-center"
    }, React.createElement('div', {
      className: "animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
    }))
  }
  
  return !user ? children : null
}
