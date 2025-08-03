import io from 'socket.io-client'
import { API_BASE_URL } from './api.js'

/**
 * @typedef {Object} UserProgress
 * @property {string} user_id
 * @property {string} roadmap_id
 * @property {string} module_id
 * @property {string} task_id
 * @property {boolean} completed
 * @property {string} [completed_at]
 * @property {string} updated_at
 */

/**
 * @typedef {Object} UserStats
 * @property {number} streak
 * @property {number} totalCompleted
 * @property {number} level
 * @property {number} experiencePoints
 * @property {number} weeklyGoal
 * @property {number} weeklyProgress
 * @property {number} roadmapsCompleted
 * @property {number} totalStudyTime
 * @property {number} [globalRanking]
 * @property {number} attendedContests
 * @property {Object} problemsSolved
 * @property {number} problemsSolved.easy
 * @property {number} problemsSolved.medium
 * @property {number} problemsSolved.hard
 * @property {number} problemsSolved.total
 */

class WebSocketService {
  constructor() {
    this.socket = null
    this.userId = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.isConnected = false
  }

  // Initialize WebSocket connection for a user
  initializeConnection(userId) {
    if (this.socket?.connected && this.userId === userId) {
      console.log('WebSocket already connected for this user')
      return
    }

    this.userId = userId
    
    try {
      this.connect()
      
      // Set a timeout to check if connection succeeded
      setTimeout(() => {
        if (!this.isConnected) {
          console.warn('⚠️ WebSocket connection timed out - continuing without real-time features')
        }
      }, 5000)
      
    } catch (error) {
      console.error('🚫 Failed to initialize WebSocket connection:', error)
      console.log('📱 Continuing without real-time features...')
    }
  }

  connect() {
    if (this.socket) {
      this.socket.disconnect()
    }

    const serverUrl = API_BASE_URL.replace('/api', '')
    console.log('🔌 Connecting to WebSocket server:', serverUrl)

    this.socket = io(serverUrl, {
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      timeout: 10000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      withCredentials: false, // Avoid CORS issues
      autoConnect: true,
    })

    this.setupEventListeners()
  }

  setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id)
      this.isConnected = true
      this.reconnectAttempts = 0

      // Join user-specific room
      if (this.userId) {
        this.socket?.emit('join-room', this.userId)
      }
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason)
      this.isConnected = false

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        console.log('Server disconnected the client')
      } else {
        // Client or network issue, attempt reconnection
        this.handleReconnection()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('🚫 WebSocket connection error:', error.message || error)
      console.error('🔍 Error details:', {
        description: error.description,
        context: error.context,
        type: error.type,
        transport: error.transport
      })
      this.isConnected = false
      this.handleReconnection()
    })

    // Real-time event listeners
    this.socket.on('progress-updated', (data) => {
      console.log('📊 Real-time progress update received:', data)
      this.handleProgressUpdate(data)
    })

    this.socket.on('stats-updated', (data) => {
      console.log('📈 Real-time stats update received:', data)
      this.handleStatsUpdate(data)
    })

    this.socket.on('new-roadmap-shared', (data) => {
      console.log('🗺️ New roadmap shared:', data)
      this.handleRoadmapShared(data)
    })
  }

  handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
      
      console.log(`⏳ WebSocket reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      setTimeout(() => {
        console.log('🔄 Attempting WebSocket reconnection...')
        this.connect()
      }, delay)
    } else {
      console.warn('⚠️ Max WebSocket reconnection attempts reached. Continuing without real-time features.')
      console.log('📱 Application will continue to work with local storage and API fallbacks.')
      window.dispatchEvent(new CustomEvent('websocket-connection-failed', {
        detail: { message: 'Real-time features unavailable, using local mode' }
      }))
    }
  }

  // Handle real-time updates
  handleProgressUpdate(data) {
    window.dispatchEvent(new CustomEvent('progress-updated', {
      detail: data
    }))
  }

  handleStatsUpdate(data) {
    window.dispatchEvent(new CustomEvent('stats-updated', {
      detail: data
    }))
  }

  handleRoadmapShared(data) {
    window.dispatchEvent(new CustomEvent('roadmap-shared', {
      detail: data
    }))
  }

  // Emit events to server
  emitProgressUpdate(progressData) {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ WebSocket not connected, cannot emit progress update')
      return
    }

    this.socket.emit('progress-update', {
      ...progressData,
      timestamp: new Date().toISOString(),
    })
  }

  emitStatsUpdate(statsData) {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ WebSocket not connected, cannot emit stats update')
      return
    }

    this.socket.emit('stats-update', {
      ...statsData,
      timestamp: new Date().toISOString(),
    })
  }

  emitRoadmapShared(roadmapData) {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ WebSocket not connected, cannot emit roadmap shared')
      return
    }

    this.socket.emit('roadmap-shared', {
      ...roadmapData,
      timestamp: new Date().toISOString(),
    })
  }

  // Subscribe to real-time events
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
    window.addEventListener('roadmap-shared', handler)
    
    return () => {
      window.removeEventListener('roadmap-shared', handler)
    }
  }

  // Connection status
  isSocketConnected() {
    return this.isConnected && this.socket?.connected === true
  }

  getConnectionStatus() {
    if (!this.socket) return 'disconnected'
    if (this.socket.connected) return 'connected'
    if (this.socket.connecting) return 'connecting'
    return 'error'
  }

  // Test connection method
  testConnection() {
    return new Promise((resolve) => {
      if (this.isSocketConnected()) {
        resolve(true)
        return
      }

      if (!this.socket) {
        resolve(false)
        return
      }

      const timeout = setTimeout(() => {
        resolve(false)
      }, 3000)

      this.socket.once('connect', () => {
        clearTimeout(timeout)
        resolve(true)
      })

      this.socket.once('connect_error', () => {
        clearTimeout(timeout)
        resolve(false)
      })
    })
  }

  // Cleanup
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket')
      this.socket.disconnect()
      this.socket = null
    }
    this.userId = null
    this.isConnected = false
    this.reconnectAttempts = 0
  }

  // Fallback methods for offline functionality
  async fallbackUpdateProgress(userId, roadmapId, moduleId, taskId, completed) {
    try {
      // Store in localStorage as fallback
      const progressKey = `progress_${userId}_${roadmapId}_${moduleId}_${taskId}`
      const progressData = {
        user_id: userId,
        roadmap_id: roadmapId,
        module_id: moduleId,
        task_id: taskId,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
        synced: false,
      }
      
      localStorage.setItem(progressKey, JSON.stringify(progressData))
      
      // Emit custom event for local updates
      window.dispatchEvent(new CustomEvent('progress-updated', {
        detail: {
          type: 'UPDATE',
          progress: progressData,
        }
      }))
      
      console.log('📱 Progress stored locally for later sync')
      
    } catch (error) {
      console.error('Failed to store progress locally:', error)
    }
  }

  // Sync offline data when connection is restored
  async syncOfflineData() {
    if (!this.isConnected) return

    try {
      const keys = Object.keys(localStorage)
      const progressKeys = keys.filter(key => key.startsWith('progress_') && key.includes('synced'))
      
      for (const key of progressKeys) {
        const progressData = JSON.parse(localStorage.getItem(key) || '{}')
        if (!progressData.synced) {
          this.emitProgressUpdate({
            userId: progressData.user_id,
            roadmapId: progressData.roadmap_id,
            moduleId: progressData.module_id,
            taskId: progressData.task_id,
            completed: progressData.completed,
          })
          
          // Mark as synced
          progressData.synced = true
          localStorage.setItem(key, JSON.stringify(progressData))
        }
      }
      
      console.log('🔄 Offline data synced successfully')
    } catch (error) {
      console.error('Failed to sync offline data:', error)
    }
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService()
export default webSocketService
