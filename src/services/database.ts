import { API_BASE_URL } from './api'

export interface User {
  id: string
  email: string
  name: string
  profileImage?: string
  bio?: string
  location?: string
  githubUsername?: string
  twitterUsername?: string
  learningGoals?: string[]
  stats: UserStats
  preferences: UserPreferences
}

export interface UserStats {
  streak: number
  totalCompleted: number
  level: number
  experiencePoints: number
  weeklyGoal: number
  weeklyProgress: number
  roadmapsCompleted: number
  totalStudyTime: number
  globalRanking?: number
  attendedContests: number
  problemsSolved: {
    easy: number
    medium: number
    hard: number
    total: number
  }
}

export interface UserPreferences {
  emailNotifications: boolean
  weeklyDigest: boolean
  achievementAlerts: boolean
  theme: 'light' | 'dark' | 'system'
}

export interface UserProgress {
  user_id: string
  roadmap_id: string
  module_id: string
  task_id: string
  completed: boolean
  completed_at?: string
  updated_at: string
}

export interface Roadmap {
  id: string
  user_id: string
  title: string
  description: string
  difficulty: string
  estimated_duration: string
  ai_provider: string
  category: string
  modules: any[]
  progress: number
  created_at: string
}

class DatabaseService {
  private baseUrl = API_BASE_URL
  private isCloudEnvironment = this.detectCloudEnvironment()

  private detectCloudEnvironment(): boolean {
    return window.location.hostname.includes('fly.dev') ||
           window.location.hostname.includes('vercel.app') ||
           window.location.hostname.includes('netlify.app') ||
           window.location.hostname.includes('herokuapp.com') ||
           !window.location.hostname.includes('localhost')
  }

  // User authentication and profile management
  async createUser(userData: {
    email: string
    password: string
    name: string
    profileImage?: string
  }): Promise<{ user: User | null; error: string | null }> {
    // Use fallback in cloud environment
    if (this.isCloudEnvironment) {
      return this.createUserFallback(userData)
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      })

      const data = await response.json()

      if (!response.ok) {
        return { user: null, error: data.error || 'Failed to create user' }
      }

      return { user: data.user, error: null }
    } catch (error: any) {
      console.warn('API not available, using fallback:', error?.message)
      return this.createUserFallback(userData)
    }
  }

  private createUserFallback(userData: any): Promise<{ user: User | null; error: string | null }> {
    return new Promise((resolve) => {
      const user: User = {
        id: 'user-' + Date.now(),
        email: userData.email,
        name: userData.name,
        profileImage: userData.profileImage,
        stats: {
          streak: 0,
          totalCompleted: 0,
          level: 1,
          experiencePoints: 0,
          weeklyGoal: 5,
          weeklyProgress: 0,
          roadmapsCompleted: 0,
          totalStudyTime: 0,
          globalRanking: undefined,
          attendedContests: 0,
          problemsSolved: {
            easy: 0,
            medium: 0,
            hard: 0,
            total: 0
          }
        },
        preferences: {
          emailNotifications: true,
          weeklyDigest: true,
          achievementAlerts: true,
          theme: 'light'
        }
      }

      localStorage.setItem('ai-roadmap-user', JSON.stringify(user))
      localStorage.setItem('ai-roadmap-users', JSON.stringify([user]))

      resolve({ user, error: null })
    })
  }

  async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { user: null, error: data.error || 'Invalid credentials' }
      }

      // Store user session in localStorage
      localStorage.setItem('ai-roadmap-user', JSON.stringify(data.user))
      
      return { user: data.user, error: null }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error signing in'
      console.error('Failed to sign in:', errorMessage)
      return { user: null, error: errorMessage }
    }
  }

  async signOut(): Promise<{ error: string | null }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        return { error: data.error || 'Failed to sign out' }
      }

      // Clear local storage
      localStorage.removeItem('ai-roadmap-user')
      
      return { error: null }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error signing out'
      console.error('Failed to sign out:', errorMessage)
      return { error: errorMessage }
    }
  }

  async getCurrentUser(): Promise<{ user: User | null; error: string | null }> {
    try {
      // First check localStorage for cached user
      const cachedUser = localStorage.getItem('ai-roadmap-user')
      if (cachedUser) {
        const user = JSON.parse(cachedUser)
        return { user, error: null }
      }

      const response = await fetch(`${this.baseUrl}/auth/me`, {
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          return { user: null, error: null } // Not authenticated
        }
        const data = await response.json()
        return { user: null, error: data.error || 'Failed to get current user' }
      }

      const data = await response.json()
      
      // Cache user data
      localStorage.setItem('ai-roadmap-user', JSON.stringify(data.user))
      
      return { user: data.user, error: null }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error getting current user'
      console.error('Failed to get current user:', errorMessage)
      return { user: null, error: errorMessage }
    }
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<{ user: User | null; error: string | null }> {
    try {
      const response = await fetch(`${this.baseUrl}/user/profile/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (!response.ok) {
        return { user: null, error: data.error || 'Failed to update profile' }
      }

      // Update cached user data
      localStorage.setItem('ai-roadmap-user', JSON.stringify(data.user))
      
      return { user: data.user, error: null }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error updating profile'
      console.error('Failed to update profile:', errorMessage)
      return { user: null, error: errorMessage }
    }
  }

  // Progress tracking
  async updateProgress(
    userId: string,
    roadmapId: string,
    moduleId: string,
    taskId: string,
    completed: boolean
  ): Promise<{ progress: UserProgress | null; error: string | null }> {
    try {
      const response = await fetch(`${this.baseUrl}/progress/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          roadmapId,
          moduleId,
          taskId,
          completed,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { progress: null, error: data.error || 'Failed to update progress' }
      }

      return { progress: data.progress, error: null }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error updating progress'
      console.error('Failed to update progress:', errorMessage)
      return { progress: null, error: errorMessage }
    }
  }

  async getUserProgress(userId: string): Promise<UserProgress[]> {
    try {
      const response = await fetch(`${this.baseUrl}/progress/${userId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        console.error('Failed to fetch user progress')
        return []
      }

      const data = await response.json()
      return data.progress || []
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error fetching progress'
      console.error('Failed to fetch progress:', errorMessage)
      return []
    }
  }

  // Stats management
  async updateStats(userId: string, statsUpdate: Partial<UserStats>): Promise<{ stats: UserStats | null; error: string | null }> {
    try {
      const response = await fetch(`${this.baseUrl}/user/stats/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(statsUpdate),
      })

      const data = await response.json()

      if (!response.ok) {
        return { stats: null, error: data.error || 'Failed to update stats' }
      }

      return { stats: data.stats, error: null }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error updating stats'
      console.error('Failed to update stats:', errorMessage)
      return { stats: null, error: errorMessage }
    }
  }

  async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      const response = await fetch(`${this.baseUrl}/user/stats/${userId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        console.error('Failed to fetch user stats')
        return null
      }

      const data = await response.json()
      return data.stats || null
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error fetching stats'
      console.error('Failed to fetch stats:', errorMessage)
      return null
    }
  }

  // Roadmap management
  async saveRoadmap(userId: string, roadmap: any): Promise<{ roadmap: Roadmap | null; error: string | null }> {
    try {
      const response = await fetch(`${this.baseUrl}/roadmap/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          ...roadmap,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { roadmap: null, error: data.error || 'Failed to save roadmap' }
      }

      return { roadmap: data.roadmap, error: null }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error saving roadmap'
      console.error('Failed to save roadmap:', errorMessage)
      return { roadmap: null, error: errorMessage }
    }
  }

  async getUserRoadmaps(userId: string): Promise<Roadmap[]> {
    try {
      const response = await fetch(`${this.baseUrl}/roadmap/user/${userId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        console.error('Failed to fetch user roadmaps')
        return []
      }

      const data = await response.json()
      return data.roadmaps || []
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error fetching roadmaps'
      console.error('Failed to fetch roadmaps:', errorMessage)
      return []
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService()
export default databaseService
