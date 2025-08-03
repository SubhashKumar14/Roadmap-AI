import io, { Socket } from 'socket.io-client'
import { API_BASE_URL } from './api'

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

class WebSocketService {
  private socket: Socket | null = null
  private userId: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private isConnected = false

  // Initialize WebSocket connection for a user
  initializeConnection(userId: string) {
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

  private connect() {
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

  private setupEventListeners() {
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

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)

      console.log(`⏳ WebSocket reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      setTimeout(() => {
        console.log('���� Attempting WebSocket reconnection...')
        this.connect()
      }, delay)
    } else {
      console.error('🔴 Max WebSocket reconnection attempts reached. Continuing without real-time features.')
      window.dispatchEvent(new CustomEvent('websocket-connection-failed'))
    }
  }

  // Handle real-time updates
  private handleProgressUpdate(data: { type: string; progress: UserProgress }) {
    window.dispatchEvent(new CustomEvent('progress-updated', {
      detail: data
    }))
  }

  private handleStatsUpdate(data: { type: string; stats: UserStats }) {
    window.dispatchEvent(new CustomEvent('stats-updated', {
      detail: data
    }))
  }

  private handleRoadmapShared(data: any) {
    window.dispatchEvent(new CustomEvent('roadmap-shared', {
      detail: data
    }))
  }

  // Emit events to server
  emitProgressUpdate(progressData: {
    userId: string
    roadmapId: string
    moduleId: string
    taskId: string
    completed: boolean
  }) {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ WebSocket not connected, cannot emit progress update')
      return
    }

    this.socket.emit('progress-update', {
      ...progressData,
      timestamp: new Date().toISOString(),
    })
  }

  emitStatsUpdate(statsData: {
    userId: string
    stats: Partial<UserStats>
  }) {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ WebSocket not connected, cannot emit stats update')
      return
    }

    this.socket.emit('stats-update', {
      ...statsData,
      timestamp: new Date().toISOString(),
    })
  }

  emitRoadmapShared(roadmapData: {
    userId: string
    roadmap: any
  }) {
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
  subscribeToProgressUpdates(callback: (data: any) => void) {
    const handler = (event: CustomEvent) => callback(event.detail)
    window.addEventListener('progress-updated', handler as EventListener)
    
    return () => {
      window.removeEventListener('progress-updated', handler as EventListener)
    }
  }

  subscribeToStatsUpdates(callback: (data: any) => void) {
    const handler = (event: CustomEvent) => callback(event.detail)
    window.addEventListener('stats-updated', handler as EventListener)
    
    return () => {
      window.removeEventListener('stats-updated', handler as EventListener)
    }
  }

  subscribeToRoadmapUpdates(callback: (data: any) => void) {
    const handler = (event: CustomEvent) => callback(event.detail)
    window.addEventListener('roadmap-shared', handler as EventListener)
    
    return () => {
      window.removeEventListener('roadmap-shared', handler as EventListener)
    }
  }

  // Connection status
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true
  }

  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' | 'error' {
    if (!this.socket) return 'disconnected'
    if (this.socket.connected) return 'connected'
    if (this.socket.connecting) return 'connecting'
    return 'error'
  }

  // Test connection method
  testConnection(): Promise<boolean> {
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
  async fallbackUpdateProgress(
    userId: string,
    roadmapId: string,
    moduleId: string,
    taskId: string,
    completed: boolean
  ) {
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
