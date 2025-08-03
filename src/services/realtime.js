import { databaseService } from './database.js'
import { webSocketService } from './websocket.js'

/**
 * @typedef {Object} ProgressUpdateData
 * @property {'INSERT'|'UPDATE'|'DELETE'} type
 * @property {Object} progress
 */

/**
 * @typedef {Object} StatsUpdateData
 * @property {'INSERT'|'UPDATE'|'DELETE'} type
 * @property {Object} stats
 */

class RealtimeService {
  constructor() {
    this.userId = null
    this.isInitialized = false
  }

  // Initialize real-time subscriptions for a user
  async initializeUserSubscriptions(userId) {
    if (this.isInitialized && this.userId === userId) {
      console.log('Real-time service already initialized for this user')
      return
    }

    this.userId = userId
    this.isInitialized = true

    console.log('�� Initializing real-time subscriptions for user:', userId)

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
  subscribeToUpdates() {
    // Subscribe to progress updates
    webSocketService.subscribeToProgressUpdates((data) => {
      console.log('📊 Progress update received:', data)
      this.handleProgressUpdate(data)
    })

    // Subscribe to stats updates
    webSocketService.subscribeToStatsUpdates((data) => {
      console.log('📈 Stats update received:', data)
      this.handleStatsUpdate(data)
    })

    // Subscribe to roadmap updates
    webSocketService.subscribeToRoadmapUpdates((data) => {
      console.log('🗺️ Roadmap update received:', data)
      this.handleRoadmapUpdate(data)
    })
  }

  // Handle progress updates
  handleProgressUpdate(data) {
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('progress-updated', {
      detail: data
    }))
  }

  // Handle stats updates
  handleStatsUpdate(data) {
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('stats-updated', {
      detail: data
    }))
  }

  // Handle roadmap updates
  handleRoadmapUpdate(data) {
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('roadmap-updated', {
      detail: data
    }))
  }

  // Update user progress in real-time
  async updateProgress(roadmapId, moduleId, taskId, completed) {
    if (!this.userId) {
      throw new Error('User not authenticated')
    }

    try {
      console.log('🔄 Updating progress:', { roadmapId, moduleId, taskId, completed })

      // Update progress via Qdrant database service
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
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error updating progress'
      console.error('Failed to update progress:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Update user stats in real-time
  async updateStats(statsUpdate) {
    if (!this.userId) {
      throw new Error('User not authenticated')
    }

    try {
      console.log('🔄 Updating stats:', statsUpdate)

      // Update stats via Qdrant database service
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
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error updating stats'
      console.error('Failed to update stats:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Get user progress from Qdrant database
  async getUserProgress(userId) {
    try {
      console.log('📊 Fetching user progress for:', userId)
      const progress = await databaseService.getUserProgress(userId)
      return progress
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error fetching user progress'
      console.error('Failed to fetch user progress:', errorMessage)
      return []
    }
  }

  // Get user stats from Qdrant database
  async getUserStats(userId) {
    try {
      console.log('📈 Fetching user stats for:', userId)
      const stats = await databaseService.getUserStats(userId)
      return stats
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error fetching user stats'
      console.error('Failed to fetch user stats:', errorMessage)
      return null
    }
  }

  // Save roadmap to Qdrant database
  async saveRoadmap(roadmap) {
    if (!this.userId) {
      throw new Error('User not authenticated')
    }

    try {
      console.log('🗺️ Saving roadmap:', roadmap.title)

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
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error saving roadmap'
      console.error('Failed to save roadmap:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Get user roadmaps from Qdrant database
  async getUserRoadmaps(userId) {
    try {
      console.log('🗺️ Fetching user roadmaps for:', userId)
      const roadmaps = await databaseService.getUserRoadmaps(userId)
      return roadmaps
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error fetching roadmaps'
      console.error('Failed to fetch roadmaps:', errorMessage)
      return []
    }
  }

  // Sync user profile data to Qdrant
  async syncUserProfile(userId, profileData) {
    try {
      console.log('👤 Syncing user profile for:', userId)

      const { user, error } = await databaseService.updateProfile(userId, profileData)

      if (error) {
        console.error('Error syncing profile:', error)
        throw new Error(`Failed to sync profile: ${error}`)
      }

      return user
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error syncing profile'
      console.error('Failed to sync profile:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Get user profile from Qdrant database
  async getUserProfile(userId) {
    try {
      console.log('👤 Fetching user profile for:', userId)
      const { user, error } = await databaseService.getCurrentUser()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return user
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error fetching profile'
      console.error('Failed to fetch profile:', errorMessage)
      return null
    }
  }

  // Check connection status
  isConnected() {
    return webSocketService.isSocketConnected()
  }

  getConnectionStatus() {
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
  subscribeToProgressUpdates(callback) {
    const handler = (event) => callback(event.detail)
    window.addEventListener('progress-updated', handler)
    
    return () => {
      window.removeEventListener('progress-updated', handler)
    }
  }

  subscribeToStatsUpdates(callback) {
    const handler = (event) => callback(event.detail)
    window.addEventListener('stats-updated', handler)
    
    return () => {
      window.removeEventListener('stats-updated', handler)
    }
  }

  subscribeToRoadmapUpdates(callback) {
    const handler = (event) => callback(event.detail)
    window.addEventListener('roadmap-updated', handler)
    
    return () => {
      window.removeEventListener('roadmap-updated', handler)
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
