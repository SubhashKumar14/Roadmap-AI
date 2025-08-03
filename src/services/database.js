import { API_BASE_URL } from './api.js'

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
 * @property {UserStats} stats
 * @property {UserPreferences} preferences
 * @property {string} sessionToken
 * @property {string} sessionExpiry
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

/**
 * @typedef {Object} UserPreferences
 * @property {boolean} emailNotifications
 * @property {boolean} weeklyDigest
 * @property {boolean} achievementAlerts
 * @property {'light'|'dark'|'system'} theme
 */

/**
 * @typedef {Object} Roadmap
 * @property {string} id
 * @property {string} user_id
 * @property {string} title
 * @property {string} description
 * @property {string} difficulty
 * @property {string} estimated_duration
 * @property {string} ai_provider
 * @property {string} category
 * @property {Array} modules
 * @property {number} progress
 * @property {string} created_at
 */

class QdrantDatabaseService {
  constructor() {
    this.qdrantUrl = import.meta.env.VITE_QDRANT_URL || 'http://localhost:6333'
    this.qdrantApiKey = import.meta.env.VITE_QDRANT_API_KEY || ''
    this.isCloudEnvironment = this.detectCloudEnvironment()
    this.qdrantAvailable = false

    // Collection names for different data types
    this.collections = {
      users: 'users',
      roadmaps: 'roadmaps',
      progress: 'user_progress',
      sessions: 'user_sessions'
    }

    console.log('🔗 Qdrant Configuration:', {
      url: this.qdrantUrl !== 'http://localhost:6333' ? 'configured' : 'default/missing',
      apiKey: this.qdrantApiKey ? 'configured' : 'missing',
      isCloud: this.isCloudEnvironment
    })

    // Only initialize if we have proper configuration and we're not trying to use localhost in cloud
    if (this.qdrantUrl !== 'http://localhost:6333' && this.qdrantApiKey) {
      this.initializeCollections()
    } else {
      console.warn('⚠️ Qdrant not properly configured, using localStorage fallback mode')
      this.qdrantAvailable = false
    }
  }

  detectCloudEnvironment() {
    return window.location.hostname.includes('fly.dev') ||
           window.location.hostname.includes('vercel.app') ||
           window.location.hostname.includes('netlify.app') ||
           window.location.hostname.includes('herokuapp.com') ||
           !window.location.hostname.includes('localhost')
  }

  async initializeCollections() {
    try {
      // Test connection first with manual timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      const testResponse = await fetch(`${this.qdrantUrl}/`, {
        headers: this.getHeaders(),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!testResponse.ok) {
        throw new Error('Qdrant connection test failed')
      }

      // Initialize all required collections
      await Promise.all([
        this.createCollectionIfNotExists(this.collections.users),
        this.createCollectionIfNotExists(this.collections.roadmaps),
        this.createCollectionIfNotExists(this.collections.progress),
        this.createCollectionIfNotExists(this.collections.sessions)
      ])

      this.qdrantAvailable = true
      console.log('✅ Qdrant collections initialized and available')
    } catch (error) {
      console.error('❌ Failed to initialize Qdrant collections:', error)
      this.qdrantAvailable = false
      console.warn('⚠️ Falling back to localStorage mode')
    }
  }

  async createCollectionIfNotExists(collectionName) {
    try {
      const response = await fetch(`${this.qdrantUrl}/collections/${collectionName}`, {
        headers: this.getHeaders()
      })

      if (response.status === 404) {
        // Collection doesn't exist, create it
        await fetch(`${this.qdrantUrl}/collections/${collectionName}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify({
            vectors: {
              size: 384, // Standard embedding size
              distance: 'Cosine'
            }
          })
        })
        console.log(`📊 Created Qdrant collection: ${collectionName}`)
      }
    } catch (error) {
      console.warn(`⚠️ Could not create collection ${collectionName}:`, error)
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    }
    if (this.qdrantApiKey) {
      headers['Authorization'] = `Bearer ${this.qdrantApiKey}`
    }
    return headers
  }

  // Generate a simple embedding from text (fallback method)
  generateSimpleEmbedding(text) {
    const hash = this.simpleHash(text)
    const embedding = new Array(384).fill(0)
    
    // Create a simple deterministic embedding
    for (let i = 0; i < 384; i++) {
      embedding[i] = Math.sin(hash + i) * 0.5
    }
    
    return embedding
  }

  simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash
  }

  generateSessionToken() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  getSessionExpiry() {
    // 24 hours from now
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }

  // User authentication and profile management
  async createUser(userData) {
    try {
      const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      const sessionToken = this.generateSessionToken()
      const sessionExpiry = this.getSessionExpiry()

      const user = {
        id: userId,
        email: userData.email,
        name: userData.name,
        profileImage: userData.profileImage || '',
        bio: '',
        location: '',
        githubUsername: '',
        twitterUsername: '',
        learningGoals: [],
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
        },
        sessionToken,
        sessionExpiry,
        createdAt: new Date().toISOString(),
        // Store password hash for simple auth (in production use proper encryption)
        passwordHash: btoa(userData.password) // Simple base64 encoding (replace with proper hashing)
      }

      // Store in Qdrant
      await this.storeInQdrant(this.collections.users, userId, user, userData.email)

      // Store session
      await this.storeSession(userId, sessionToken, sessionExpiry)

      // Store user locally for immediate access
      localStorage.setItem('ai-roadmap-user', JSON.stringify(user))
      localStorage.setItem('ai-roadmap-session', sessionToken)

      return { user, error: null }
    } catch (error) {
      console.error('Failed to create user:', error)
      return { user: null, error: error.message || 'Failed to create user' }
    }
  }

  async storeInQdrant(collection, id, data, searchText = '') {
    // Immediate fallback if Qdrant is not available
    if (!this.qdrantAvailable) {
      console.log('📝 Using localStorage fallback for storing:', collection, id)
      const items = JSON.parse(localStorage.getItem(`qdrant-${collection}`) || '[]')
      const existingIndex = items.findIndex(item => item.id === id)
      if (existingIndex >= 0) {
        items[existingIndex] = { id, data }
      } else {
        items.push({ id, data })
      }
      localStorage.setItem(`qdrant-${collection}`, JSON.stringify(items))
      return true
    }

    try {
      const embedding = this.generateSimpleEmbedding(searchText || JSON.stringify(data))

      const response = await fetch(`${this.qdrantUrl}/collections/${collection}/points`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          points: [{
            id: id,
            vector: embedding,
            payload: data
          }]
        })
      })

      if (!response.ok) {
        throw new Error(`Qdrant storage failed: ${response.statusText}`)
      }

      return true
    } catch (error) {
      console.error('Qdrant storage error:', error)
      // Fallback to localStorage
      const items = JSON.parse(localStorage.getItem(`qdrant-${collection}`) || '[]')
      const existingIndex = items.findIndex(item => item.id === id)
      if (existingIndex >= 0) {
        items[existingIndex] = { id, data }
      } else {
        items.push({ id, data })
      }
      localStorage.setItem(`qdrant-${collection}`, JSON.stringify(items))
      return true
    }
  }

  async searchInQdrant(collection, query, limit = 10) {
    // Immediate fallback if Qdrant is not available
    if (!this.qdrantAvailable) {
      console.log('🔍 Using localStorage fallback for searching:', collection, query)
      const items = JSON.parse(localStorage.getItem(`qdrant-${collection}`) || '[]')
      // Simple text-based search in localStorage
      const searchLower = query.toLowerCase()
      const filtered = items.filter(item => {
        const searchContent = JSON.stringify(item.data).toLowerCase()
        return searchContent.includes(searchLower)
      })
      return filtered.slice(0, limit).map(item => ({ id: item.id, ...item.data }))
    }

    try {
      const embedding = this.generateSimpleEmbedding(query)

      const response = await fetch(`${this.qdrantUrl}/collections/${collection}/points/search`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          vector: embedding,
          limit,
          with_payload: true
        })
      })

      if (!response.ok) {
        throw new Error(`Qdrant search failed: ${response.statusText}`)
      }

      const result = await response.json()
      return result.result.map(item => ({
        id: item.id,
        score: item.score,
        ...item.payload
      }))
    } catch (error) {
      console.error('Qdrant search error:', error)
      // Fallback to localStorage
      const items = JSON.parse(localStorage.getItem(`qdrant-${collection}`) || '[]')
      const searchLower = query.toLowerCase()
      const filtered = items.filter(item => {
        const searchContent = JSON.stringify(item.data).toLowerCase()
        return searchContent.includes(searchLower)
      })
      return filtered.slice(0, limit).map(item => ({ id: item.id, ...item.data }))
    }
  }

  async getFromQdrant(collection, id) {
    // Immediate fallback if Qdrant is not available
    if (!this.qdrantAvailable) {
      console.log('📋 Using localStorage fallback for getting:', collection, id)
      const items = JSON.parse(localStorage.getItem(`qdrant-${collection}`) || '[]')
      const item = items.find(item => item.id === id)
      return item ? item.data : null
    }

    try {
      const response = await fetch(`${this.qdrantUrl}/collections/${collection}/points/${id}`, {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`Qdrant get failed: ${response.statusText}`)
      }

      const result = await response.json()
      return result.result.payload
    } catch (error) {
      console.error('Qdrant get error:', error)
      // Fallback to localStorage
      const items = JSON.parse(localStorage.getItem(`qdrant-${collection}`) || '[]')
      const item = items.find(item => item.id === id)
      return item ? item.data : null
    }
  }

  async storeSession(userId, sessionToken, sessionExpiry) {
    const sessionData = {
      userId,
      sessionToken,
      sessionExpiry,
      createdAt: new Date().toISOString()
    }

    await this.storeInQdrant(this.collections.sessions, sessionToken, sessionData)
  }

  async validateSession(sessionToken) {
    try {
      const sessionData = await this.getFromQdrant(this.collections.sessions, sessionToken)
      
      if (!sessionData) {
        return { valid: false, error: 'Session not found' }
      }

      const now = new Date()
      const expiry = new Date(sessionData.sessionExpiry)

      if (now > expiry) {
        return { valid: false, error: 'Session expired' }
      }

      // Extend session by another 24 hours if less than 12 hours remaining
      const hoursRemaining = (expiry - now) / (1000 * 60 * 60)
      if (hoursRemaining < 12) {
        const newExpiry = this.getSessionExpiry()
        sessionData.sessionExpiry = newExpiry
        await this.storeInQdrant(this.collections.sessions, sessionToken, sessionData)
      }

      return { valid: true, userId: sessionData.userId, sessionData }
    } catch (error) {
      console.error('Session validation error:', error)
      return { valid: false, error: 'Session validation failed' }
    }
  }

  async signIn(email, password) {
    try {
      // Search for user by email
      const users = await this.searchInQdrant(this.collections.users, email, 5)
      const user = users.find(u => u.email === email)

      if (!user) {
        return { user: null, error: 'User not found' }
      }

      // Simple password verification (in production use proper password hashing)
      const storedHash = user.passwordHash
      const providedHash = btoa(password)

      if (storedHash !== providedHash) {
        return { user: null, error: 'Invalid password' }
      }

      // Create new session
      const sessionToken = this.generateSessionToken()
      const sessionExpiry = this.getSessionExpiry()
      
      user.sessionToken = sessionToken
      user.sessionExpiry = sessionExpiry

      // Update user in Qdrant
      await this.storeInQdrant(this.collections.users, user.id, user, email)
      
      // Store session
      await this.storeSession(user.id, sessionToken, sessionExpiry)

      // Store locally
      localStorage.setItem('ai-roadmap-user', JSON.stringify(user))
      localStorage.setItem('ai-roadmap-session', sessionToken)

      return { user, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { user: null, error: error.message || 'Sign in failed' }
    }
  }

  async signOut() {
    try {
      const sessionToken = localStorage.getItem('ai-roadmap-session')
      
      if (sessionToken) {
        // Invalidate session in Qdrant by setting expiry to past
        const sessionData = await this.getFromQdrant(this.collections.sessions, sessionToken)
        if (sessionData) {
          sessionData.sessionExpiry = new Date(Date.now() - 1000).toISOString()
          await this.storeInQdrant(this.collections.sessions, sessionToken, sessionData)
        }
      }

      // Clear local storage
      localStorage.removeItem('ai-roadmap-user')
      localStorage.removeItem('ai-roadmap-session')

      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error: error.message || 'Sign out failed' }
    }
  }

  async getCurrentUser() {
    try {
      const sessionToken = localStorage.getItem('ai-roadmap-session')
      
      if (!sessionToken) {
        return { user: null, error: null }
      }

      // Validate session
      const sessionValidation = await this.validateSession(sessionToken)
      
      if (!sessionValidation.valid) {
        // Clear invalid session
        localStorage.removeItem('ai-roadmap-user')
        localStorage.removeItem('ai-roadmap-session')
        return { user: null, error: null }
      }

      // Get user data
      const user = await this.getFromQdrant(this.collections.users, sessionValidation.userId)
      
      if (user) {
        localStorage.setItem('ai-roadmap-user', JSON.stringify(user))
        return { user, error: null }
      }

      return { user: null, error: null }
    } catch (error) {
      console.error('Get current user error:', error)
      
      // Fallback to localStorage
      const cachedUser = localStorage.getItem('ai-roadmap-user')
      if (cachedUser) {
        const user = JSON.parse(cachedUser)
        return { user, error: null }
      }
      
      return { user: null, error: null }
    }
  }

  async updateProfile(userId, updates) {
    try {
      const user = await this.getFromQdrant(this.collections.users, userId)
      
      if (!user) {
        return { user: null, error: 'User not found' }
      }

      // Update user data
      const updatedUser = { ...user, ...updates, updatedAt: new Date().toISOString() }
      
      // Store back in Qdrant
      await this.storeInQdrant(this.collections.users, userId, updatedUser, updatedUser.email)
      
      // Update local storage
      localStorage.setItem('ai-roadmap-user', JSON.stringify(updatedUser))

      return { user: updatedUser, error: null }
    } catch (error) {
      console.error('Update profile error:', error)
      return { user: null, error: error.message || 'Failed to update profile' }
    }
  }

  // Roadmap management
  async saveRoadmap(userId, roadmap) {
    try {
      const roadmapId = roadmap.id || 'roadmap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      
      const savedRoadmap = {
        id: roadmapId,
        user_id: userId,
        title: roadmap.title,
        description: roadmap.description,
        difficulty: roadmap.difficulty,
        estimated_duration: roadmap.estimatedDuration,
        ai_provider: roadmap.aiProvider,
        category: roadmap.category,
        modules: roadmap.modules,
        progress: roadmap.progress || 0,
        created_at: new Date().toISOString()
      }

      // Store in Qdrant with roadmap title and description as searchable text
      const searchText = `${roadmap.title} ${roadmap.description} ${roadmap.category}`
      await this.storeInQdrant(this.collections.roadmaps, roadmapId, savedRoadmap, searchText)

      // Also store in localStorage for immediate access
      const roadmaps = JSON.parse(localStorage.getItem('ai-roadmap-roadmaps') || '[]')
      roadmaps.unshift(savedRoadmap)
      localStorage.setItem('ai-roadmap-roadmaps', JSON.stringify(roadmaps))

      return { roadmap: savedRoadmap, error: null }
    } catch (error) {
      console.error('Save roadmap error:', error)
      return { roadmap: null, error: error.message || 'Failed to save roadmap' }
    }
  }

  async getUserRoadmaps(userId) {
    try {
      // Search for user's roadmaps in Qdrant
      const roadmaps = await this.searchInQdrant(this.collections.roadmaps, `user:${userId}`, 50)
      
      // Filter by user_id to ensure accuracy
      const userRoadmaps = roadmaps.filter(r => r.user_id === userId)
      
      // Sort by creation date
      userRoadmaps.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      return userRoadmaps
    } catch (error) {
      console.error('Get user roadmaps error:', error)
      
      // Fallback to localStorage
      const roadmaps = JSON.parse(localStorage.getItem('ai-roadmap-roadmaps') || '[]')
      return roadmaps.filter(r => r.user_id === userId)
    }
  }

  // Progress tracking
  async updateProgress(userId, roadmapId, moduleId, taskId, completed) {
    try {
      const progressId = `${userId}_${roadmapId}_${moduleId}_${taskId}`
      
      const progressData = {
        user_id: userId,
        roadmap_id: roadmapId,
        module_id: moduleId,
        task_id: taskId,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }

      // Store in Qdrant
      await this.storeInQdrant(this.collections.progress, progressId, progressData, `${userId} ${roadmapId}`)

      return { progress: progressData, error: null }
    } catch (error) {
      console.error('Update progress error:', error)
      return { progress: null, error: error.message || 'Failed to update progress' }
    }
  }

  async getUserProgress(userId) {
    try {
      // Search for user's progress
      const progress = await this.searchInQdrant(this.collections.progress, `user:${userId}`, 100)
      
      // Filter by user_id
      return progress.filter(p => p.user_id === userId)
    } catch (error) {
      console.error('Get user progress error:', error)
      return []
    }
  }

  // Stats management
  async updateStats(userId, statsUpdate) {
    try {
      const user = await this.getFromQdrant(this.collections.users, userId)
      
      if (!user) {
        return { stats: null, error: 'User not found' }
      }

      // Update stats
      user.stats = { ...user.stats, ...statsUpdate, updatedAt: new Date().toISOString() }
      
      // Store back in Qdrant
      await this.storeInQdrant(this.collections.users, userId, user, user.email)

      return { stats: user.stats, error: null }
    } catch (error) {
      console.error('Update stats error:', error)
      return { stats: null, error: error.message || 'Failed to update stats' }
    }
  }

  async getUserStats(userId) {
    try {
      const user = await this.getFromQdrant(this.collections.users, userId)
      return user ? user.stats : null
    } catch (error) {
      console.error('Get user stats error:', error)
      return null
    }
  }
}

// Export singleton instance
export const databaseService = new QdrantDatabaseService()
export default databaseService
