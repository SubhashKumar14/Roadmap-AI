import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return url && key && url !== 'https://placeholder.supabase.co' && key !== 'placeholder-key'
}

interface UserProgress {
  user_id: string
  roadmap_id: string
  module_id: string
  task_id: string
  completed: boolean
  completed_at?: string
  updated_at: string
}

interface UserStats {
  user_id: string
  streak: number
  total_completed: number
  level: number
  experience_points: number
  weekly_goal: number
  weekly_progress: number
  roadmaps_completed: number
  total_study_time: number
  global_ranking?: number
  attended_contests: number
  problems_solved: {
    easy: number
    medium: number
    hard: number
    total: number
  }
  updated_at: string
}

class RealtimeService {
  private progressChannel: RealtimeChannel | null = null
  private statsChannel: RealtimeChannel | null = null
  private userId: string | null = null

  // Initialize real-time subscriptions for a user
  initializeUserSubscriptions(userId: string) {
    if (!isSupabaseConfigured()) {
      console.warn('⚠��� Supabase not configured, skipping real-time subscriptions')
      return
    }
    this.userId = userId
    this.subscribeToUserProgress(userId)
    this.subscribeToUserStats(userId)
  }

  // Subscribe to user progress updates
  private subscribeToUserProgress(userId: string) {
    this.progressChannel = supabase
      .channel(`user_progress_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📊 Real-time progress update:', payload)
          this.handleProgressUpdate(payload)
        }
      )
      .subscribe()
  }

  // Subscribe to user stats updates
  private subscribeToUserStats(userId: string) {
    this.statsChannel = supabase
      .channel(`user_stats_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_stats',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📈 Real-time stats update:', payload)
          this.handleStatsUpdate(payload)
        }
      )
      .subscribe()
  }

  // Handle progress updates
  private handleProgressUpdate(payload: any) {
    const progress: UserProgress = payload.new || payload.old
    
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('progress-updated', {
      detail: {
        type: payload.eventType,
        progress: progress
      }
    }))
  }

  // Handle stats updates
  private handleStatsUpdate(payload: any) {
    const stats: UserStats = payload.new || payload.old
    
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('stats-updated', {
      detail: {
        type: payload.eventType,
        stats: stats
      }
    }))
  }

  // Update user progress in real-time
  async updateProgress(roadmapId: string, moduleId: string, taskId: string, completed: boolean) {
    if (!this.userId) return
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data, error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: this.userId,
          roadmap_id: roadmapId,
          module_id: moduleId,
          task_id: taskId,
          completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error updating progress:', error.message || error)
        throw new Error(`Failed to update progress: ${error.message || 'Unknown error'}`)
      }

      return data
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error updating progress'
      console.error('Failed to update progress:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Update user stats in real-time
  async updateStats(statsUpdate: Partial<UserStats>) {
    if (!this.userId) return

    try {
      const { data, error } = await supabase
        .from('user_stats')
        .upsert({
          user_id: this.userId,
          ...statsUpdate,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error updating stats:', error.message || error)
        throw new Error(`Failed to update stats: ${error.message || 'Unknown error'}`)
      }

      return data
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error updating stats'
      console.error('Failed to update stats:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Get user progress from Supabase
  async getUserProgress(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching user progress:', error.message || error)
        throw new Error(`Failed to fetch user progress: ${error.message || 'Unknown error'}`)
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch user progress:', error)
      return []
    }
  }

  // Get user stats from Supabase
  async getUserStats(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching user stats:', error.message || error)
        throw new Error(`Failed to fetch user stats: ${error.message || 'Unknown error'}`)
      }

      return data || null
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
      return null
    }
  }

  // Save roadmap to Supabase
  async saveRoadmap(roadmap: any) {
    if (!this.userId) return

    try {
      const { data, error } = await supabase
        .from('roadmaps')
        .insert({
          id: roadmap.id,
          user_id: this.userId,
          title: roadmap.title,
          description: roadmap.description,
          difficulty: roadmap.difficulty,
          estimated_duration: roadmap.estimatedDuration,
          ai_provider: roadmap.aiProvider,
          category: roadmap.category,
          modules: roadmap.modules,
          progress: roadmap.progress || 0,
          created_at: roadmap.createdAt || new Date().toISOString()
        })

      if (error) {
        console.error('Error saving roadmap:', error.message || error)
        throw new Error(`Failed to save roadmap: ${error.message || 'Unknown error'}`)
      }

      return data
    } catch (error) {
      console.error('Failed to save roadmap:', error)
      throw error
    }
  }

  // Get user roadmaps from Supabase
  async getUserRoadmaps(userId: string) {
    try {
      const { data, error } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching roadmaps:', error.message || error)
        throw new Error(`Failed to fetch roadmaps: ${error.message || 'Unknown error'}`)
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch roadmaps:', error)
      return []
    }
  }

  // Cleanup subscriptions
  cleanup() {
    if (this.progressChannel) {
      supabase.removeChannel(this.progressChannel)
      this.progressChannel = null
    }
    if (this.statsChannel) {
      supabase.removeChannel(this.statsChannel)
      this.statsChannel = null
    }
    this.userId = null
  }

  // Sync user profile data
  async syncUserProfile(userId: string, profileData: any) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          name: profileData.name,
          email: profileData.email,
          bio: profileData.bio,
          location: profileData.location,
          github_username: profileData.githubUsername,
          twitter_username: profileData.twitterUsername,
          learning_goals: profileData.learningGoals,
          preferences: profileData.preferences,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error syncing profile:', error.message || error)
        throw new Error(`Failed to sync profile: ${error.message || 'Unknown error'}`)
      }

      return data
    } catch (error) {
      console.error('Failed to sync profile:', error)
      throw error
    }
  }

  // Get user profile from Supabase
  async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error.message || error)
        throw new Error(`Failed to fetch profile: ${error.message || 'Unknown error'}`)
      }

      return data || null
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      return null
    }
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService()
export default realtimeService
