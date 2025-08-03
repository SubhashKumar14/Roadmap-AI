import { databaseService, UserProgress, UserStats, Roadmap } from './database'
import { webSocketService } from './websocket'

interface ProgressUpdateData {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  progress: UserProgress
}

interface StatsUpdateData {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  stats: UserStats
}

class RealtimeService {
  private userId: string | null = null
  private isInitialized = false

  // Initialize real-time subscriptions for a user
  async initializeUserSubscriptions(userId: string) {
    if (this.isInitialized && this.userId === userId) {
      console.log('Real-time service already initialized for this user')
      return
    }

    this.userId = userId
    this.isInitialized = true

    console.log('🔄 Initializing real-time subscriptions for user:', userId)

    try {
      // Initialize WebSocket connection
      webSocketService.initializeConnection(userId)

      // Test the connection
      const isConnected = await webSocketService.testConnection()

      if (isConnected) {
        console.log('✅ WebSocket connection successful')
        // Subscribe to real-time events
        this.subscribeToUpdates()
      } else {
        console.warn('⚠️ WebSocket connection failed - continuing with API-only mode')
      }

    } catch (error) {
      console.warn('⚠️ Real-time features unavailable:', error)
      console.log('📱 Application will continue with API-only mode')
    }
  }

  // Subscribe to real-time events
  private subscribeToUpdates() {
    // Subscribe to progress updates
    webSocketService.subscribeToProgressUpdates((data: ProgressUpdateData) => {
      console.log('📊 Progress update received:', data)
      this.handleProgressUpdate(data)
    })

    // Subscribe to stats updates
    webSocketService.subscribeToStatsUpdates((data: StatsUpdateData) => {
      console.log('📈 Stats update received:', data)
      this.handleStatsUpdate(data)
    })

    // Subscribe to roadmap updates
    webSocketService.subscribeToRoadmapUpdates((data: any) => {
      console.log('🗺️ Roadmap update received:', data)
      this.handleRoadmapUpdate(data)
    })
  }

  // Handle progress updates
  private handleProgressUpdate(data: ProgressUpdateData) {
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('progress-updated', {
      detail: data
    }))
  }

  // Handle stats updates
  private handleStatsUpdate(data: StatsUpdateData) {
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('stats-updated', {
      detail: data
    }))
  }

  // Handle roadmap updates
  private handleRoadmapUpdate(data: any) {
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('roadmap-updated', {
      detail: data
    }))
  }

  // Update user progress in real-time
  async updateProgress(roadmapId: string, moduleId: string, taskId: string, completed: boolean) {
    if (!this.userId) {
      throw new Error('User not authenticated')
    }

    try {
      console.log('🔄 Updating progress:', { roadmapId, moduleId, taskId, completed })

      // Update progress via API
      const { progress, error } = await databaseService.updateProgress(
        this.userId,
        roadmapId,
        moduleId,
        taskId,
        completed
      )

      if (error) {
        console.error('Error updating progress:', error)
        throw new Error(`Failed to update progress: ${error}`)
      }

      // Emit real-time update via WebSocket
      if (webSocketService.isSocketConnected()) {
        webSocketService.emitProgressUpdate({
          userId: this.userId,
          roadmapId,
          moduleId,
          taskId,
          completed
        })
      } else {
        // Fallback for offline mode
        await webSocketService.fallbackUpdateProgress(
          this.userId,
          roadmapId,
          moduleId,
          taskId,
          completed
        )
      }

      return progress
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error updating progress'
      console.error('Failed to update progress:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Update user stats in real-time
  async updateStats(statsUpdate: Partial<UserStats>) {
    if (!this.userId) {
      throw new Error('User not authenticated')
    }

    try {
      console.log('🔄 Updating stats:', statsUpdate)

      // Update stats via API
      const { stats, error } = await databaseService.updateStats(this.userId, statsUpdate)

      if (error) {
        console.error('Error updating stats:', error)
        throw new Error(`Failed to update stats: ${error}`)
      }

      // Emit real-time update via WebSocket
      if (webSocketService.isSocketConnected()) {
        webSocketService.emitStatsUpdate({
          userId: this.userId,
          stats: statsUpdate
        })
      }

      return stats
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error updating stats'
      console.error('Failed to update stats:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Get user progress from database
  async getUserProgress(userId: string): Promise<UserProgress[]> {
    try {
      console.log('📊 Fetching user progress for:', userId)
      const progress = await databaseService.getUserProgress(userId)
      return progress
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error fetching user progress'
      console.error('Failed to fetch user progress:', errorMessage)
      return []
    }
  }

  // Get user stats from database
  async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      console.log('📈 Fetching user stats for:', userId)
      const stats = await databaseService.getUserStats(userId)
      return stats
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error fetching user stats'
      console.error('Failed to fetch user stats:', errorMessage)
      return null
    }
  }

  // Save roadmap to database
  async saveRoadmap(roadmap: any): Promise<Roadmap | null> {
    if (!this.userId) {
      throw new Error('User not authenticated')
    }

    try {
      console.log('����️ Saving roadmap:', roadmap.title)

      const { roadmap: savedRoadmap, error } = await databaseService.saveRoadmap(this.userId, roadmap)

      if (error) {
        console.error('Error saving roadmap:', error)
        throw new Error(`Failed to save roadmap: ${error}`)
      }

      // Emit real-time update via WebSocket
      if (webSocketService.isSocketConnected()) {
        webSocketService.emitRoadmapShared({
          userId: this.userId,
          roadmap: savedRoadmap
        })
      }

      return savedRoadmap
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error saving roadmap'
      console.error('Failed to save roadmap:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Get user roadmaps from database
  async getUserRoadmaps(userId: string): Promise<Roadmap[]> {
    try {
      console.log('🗺️ Fetching user roadmaps for:', userId)
      const roadmaps = await databaseService.getUserRoadmaps(userId)
      return roadmaps
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error fetching roadmaps'
      console.error('Failed to fetch roadmaps:', errorMessage)
      return []
    }
  }

  // Sync user profile data
  async syncUserProfile(userId: string, profileData: any) {
    try {
      console.log('👤 Syncing user profile for:', userId)

      const { user, error } = await databaseService.updateProfile(userId, profileData)

      if (error) {
        console.error('Error syncing profile:', error)
        throw new Error(`Failed to sync profile: ${error}`)
      }

      return user
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error syncing profile'
      console.error('Failed to sync profile:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Get user profile from database
  async getUserProfile(userId: string) {
    try {
      console.log('👤 Fetching user profile for:', userId)
      const { user, error } = await databaseService.getCurrentUser()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return user
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error fetching profile'
      console.error('Failed to fetch profile:', errorMessage)
      return null
    }
  }

  // Check connection status
  isConnected(): boolean {
    return webSocketService.isSocketConnected()
  }

  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' | 'error' {
    return webSocketService.getConnectionStatus()
  }

  // Cleanup subscriptions
  cleanup() {
    console.log('🔄 Cleaning up real-time service')
    webSocketService.disconnect()
    this.userId = null
    this.isInitialized = false
  }

  // Event subscription helpers for components
  subscribeToProgressUpdates(callback: (data: ProgressUpdateData) => void) {
    const handler = (event: CustomEvent) => callback(event.detail)
    window.addEventListener('progress-updated', handler as EventListener)
    
    return () => {
      window.removeEventListener('progress-updated', handler as EventListener)
    }
  }

  subscribeToStatsUpdates(callback: (data: StatsUpdateData) => void) {
    const handler = (event: CustomEvent) => callback(event.detail)
    window.addEventListener('stats-updated', handler as EventListener)
    
    return () => {
      window.removeEventListener('stats-updated', handler as EventListener)
    }
  }

  subscribeToRoadmapUpdates(callback: (data: any) => void) {
    const handler = (event: CustomEvent) => callback(event.detail)
    window.addEventListener('roadmap-updated', handler as EventListener)
    
    return () => {
      window.removeEventListener('roadmap-updated', handler as EventListener)
    }
  }

  // Sync offline data when connection is restored
  async syncOfflineData() {
    await webSocketService.syncOfflineData()
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService()
export default realtimeService
