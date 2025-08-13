import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
export const API_BASE_URL = API_URL

// Check if we're in a cloud environment that can't reach localhost
const isCloudEnvironment = window.location.hostname.includes('fly.dev') ||
                          window.location.hostname.includes('vercel.app') ||
                          window.location.hostname.includes('netlify.app') ||
                          window.location.hostname.includes('herokuapp.com') ||
                          !window.location.hostname.includes('localhost')

// Direct AI API clients for cloud environment (from server .env)
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const PERPLEXITY_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY || ''
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || ''

console.log('🌍 Environment detection:', {
  hostname: window.location.hostname,
  isCloudEnvironment,
  apiUrl: API_URL,
  location: window.location.href
})

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
})

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url)
    return config
  },
  (error) => {
    console.error('❌ API Request Error:', error.message || 'Request failed', error.config?.url || 'unknown URL')
    return Promise.reject(error)
  }
)

// Add response interceptor for debugging and cloud fallback
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Success:', response.status, response.config.url)
    return response
  },
  async (error) => {
    const url = error.config?.url || 'unknown'
    const status = error.response?.status || 'no-response'
    const message = error.message || 'unknown-error'
    const code = error.code || 'no-code'

    console.error('❌ API Error Details - URL:', url, 'Status:', status, 'Message:', message, 'Code:', code)

    // Use fallback for network errors
    const shouldUseFallback = (
      error.code === 'NETWORK_ERROR' ||
      error.message === 'Network Error' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ERR_NETWORK' ||
      !error.response ||
      (error.response && error.response.status >= 500)
    )

    if (shouldUseFallback) {
      console.log('🔄 TRIGGERING FALLBACK for:', url)
      try {
        const fallbackResponse = await handleCloudAPICall(error.config)
        console.log('✅ FALLBACK SUCCESSFUL for:', url)
        return fallbackResponse
      } catch (fallbackError) {
        console.error('❌ FALLBACK FAILED for:', url, fallbackError)
        // Return a basic success response to prevent app crashes
        return Promise.resolve({
          data: { error: 'Service unavailable', fallback: true, originalError: message },
          status: 200,
          statusText: 'Fallback'
        })
      }
    }

    return Promise.reject(error)
  }
)

// Handle direct API calls for cloud environment
async function handleCloudAPICall(config) {
  const url = config?.url || ''
  const method = config?.method?.toUpperCase() || 'GET'
  let data = {}

  try {
    data = config?.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}
  } catch (e) {
    console.warn('⚠️ Could not parse request data:', e?.message || 'Data parsing failed')
    data = {}
  }

  console.log('🔄 Handling fallback API call:', { method, url, dataKeys: Object.keys(data) })

  try {
    // AI roadmap generation
    if (url.includes('/ai/generate-roadmap')) {
      console.log('🤖 Generating roadmap locally')
      return await generateRoadmapDirect(data.topic, data.userId)
    }

    // Default response for any unhandled endpoint
    console.log('❓ DEFAULT HANDLER for unrecognized URL:', url, 'Method:', method)
    return Promise.resolve({
      data: {
        success: true,
        message: 'Local response for ' + url,
        fallback: true
      },
      status: 200,
      statusText: 'OK'
    })

  } catch (error) {
    const errorMessage = error?.message || 'Unknown error in handleCloudAPICall'
    console.error('❌ Error in handleCloudAPICall:', errorMessage, 'for URL:', url)
    return Promise.resolve({
      data: {
        error: 'Local API error',
        message: errorMessage,
        url: url
      },
      status: 500,
      statusText: 'Error'
    })
  }
}

// Direct AI roadmap generation for cloud environment
async function generateRoadmapDirect(topic, userId) {
  console.log('🤖 Generating roadmap directly with AI APIs for topic:', topic)

  // Classify topic to determine best AI
  const aiProvider = classifyTopic(topic)
  console.log('🎯 Selected AI provider:', aiProvider)

  let roadmap

  try {
    switch (aiProvider) {
      case 'openai':
        roadmap = await generateWithOpenAIDirect(topic)
        break
      case 'gemini':
        roadmap = await generateWithGeminiDirect(topic)
        break
      case 'perplexity':
        roadmap = await generateWithPerplexityDirect(topic)
        break
      default:
        roadmap = await generateWithOpenAIDirect(topic)
    }

    // Add YouTube videos
    roadmap = await enhanceWithYouTubeVideosDirect(roadmap)

    return { data: roadmap, status: 200, statusText: 'OK' }
  } catch (error) {
    console.error('❌ Error generating roadmap:', error)
    console.log('🔄 Using fallback roadmap due to AI API failure')
    // Return fallback roadmap instead of throwing error
    const fallbackRoadmap = createFallbackRoadmap(topic)

    return { data: fallbackRoadmap, status: 200, statusText: 'OK' }
  }
}

function classifyTopic(topic) {
  const topicLower = topic.toLowerCase()

  // Technical/Programming topics → OpenAI
  const openaiKeywords = ['programming', 'coding', 'software', 'development', 'algorithm', 'data structure', 'web', 'frontend', 'backend', 'javascript', 'python', 'react', 'node', 'api', 'database', 'sql', 'mongodb', 'ai', 'machine learning', 'ml', 'dsa', 'leetcode', 'system design']

  // Creative/Design topics → Gemini
  const geminiKeywords = ['design', 'creative', 'art', 'drawing', 'music', 'writing', 'content', 'video editing', 'photography', 'graphic design', 'ui design', 'ux design', 'animation', 'marketing', 'branding']

  // Current/Research topics → Perplexity
  const perplexityKeywords = ['news', 'trends', 'market', 'cryptocurrency', 'blockchain', 'finance', 'research', 'academic', 'startup', 'business', 'seo', 'digital marketing']

  for (const keyword of openaiKeywords) {
    if (topicLower.includes(keyword)) return 'openai'
  }

  for (const keyword of geminiKeywords) {
    if (topicLower.includes(keyword)) return 'gemini'
  }

  for (const keyword of perplexityKeywords) {
    if (topicLower.includes(keyword)) return 'perplexity'
  }

  return 'openai' // Default
}

async function generateWithOpenAIDirect(topic) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'fallback-api-key-placeholder') {
    console.warn('⚠️ OpenAI API key not configured, using fallback roadmap')
    return createFallbackRoadmap(topic)
  }

  const prompt = `Create a comprehensive learning roadmap for: "${topic}" in TUF Striver's A2Z DSA sheet format.

Please structure your response as a JSON object with this exact format:
{
  "title": "Brief title for the roadmap",
  "description": "2-3 sentence description",
  "difficulty": "beginner|intermediate|advanced",
  "estimatedDuration": "X-Y weeks/months",
  "aiProvider": "openai",
  "category": "Category (DSA/Development/Design/etc)",
  "modules": [
    {
      "id": "1",
      "title": "Module title",
      "description": "Module description",
      "completed": false,
      "difficulty": "Easy|Medium|Hard",
      "estimatedTime": "X hours",
      "tasks": [
        {
          "id": "1-1",
          "title": "Task title",
          "completed": false,
          "difficulty": "Easy|Medium|Hard",
          "type": "Theory|Practice|Project",
          "estimatedTime": "X minutes",
          "description": "Detailed task description",
          "learningObjectives": ["Objective 1", "Objective 2"],
          "prerequisites": ["Prerequisite 1"],
          "resources": {
            "articles": ["Article title"],
            "documentation": ["Doc link"],
            "practice": ["Platform/Problem name"],
            "youtubeSearch": "search query for YouTube videos"
          }
        }
      ]
    }
  ]
}

Make it comprehensive with 6-10 modules and 4-8 tasks per module. Include specific YouTube search queries for educational videos.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 3000
    })
  })

  if (!response.ok) {
    let errorText = 'Unknown error'
    try {
      errorText = await response.text()
    } catch (err) {
      console.warn('Could not read error response body')
    }
    console.error('OpenAI API Error Details:', response.status, errorText)
    return createFallbackRoadmap(topic)
  }

  const data = await response.json()
  const content = data.choices[0].message.content

  try {
    const roadmap = JSON.parse(content)
    roadmap.id = generateId()
    roadmap.createdAt = new Date().toISOString()
    roadmap.progress = 0
    return roadmap
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', content)
    return createFallbackRoadmap(topic)
  }
}

async function generateWithGeminiDirect(topic) {
  if (!GEMINI_API_KEY) {
    console.warn('⚠️ Gemini API key not configured, using fallback roadmap')
    return createFallbackRoadmap(topic)
  }

  const prompt = `Create a comprehensive learning roadmap for: "${topic}" with creative and practical approaches in TUF Striver's format.

Please structure your response as a JSON object with the same format as shown earlier, focusing on creative learning approaches with 6-8 modules and hands-on projects.`

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  })

  if (!response.ok) {
    return createFallbackRoadmap(topic)
  }

  const data = await response.json()
  const content = data.candidates[0].content.parts[0].text

  try {
    const roadmap = JSON.parse(content)
    roadmap.id = generateId()
    roadmap.aiProvider = 'gemini'
    roadmap.createdAt = new Date().toISOString()
    roadmap.progress = 0
    return roadmap
  } catch (parseError) {
    console.error('Failed to parse Gemini response:', content)
    return createFallbackRoadmap(topic)
  }
}

async function generateWithPerplexityDirect(topic) {
  if (!PERPLEXITY_API_KEY) {
    console.warn('⚠️ Perplexity API key not configured, using fallback roadmap')
    return createFallbackRoadmap(topic)
  }

  const prompt = `Create a comprehensive learning roadmap for: "${topic}" with current trends and up-to-date resources in TUF Striver's format.

Focus on the latest tools, current industry practices, and recent developments. Include 6-8 modules with current trends and research.`

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 3000
    })
  })

  if (!response.ok) {
    return createFallbackRoadmap(topic)
  }

  const data = await response.json()
  const content = data.choices[0].message.content

  try {
    const roadmap = JSON.parse(content)
    roadmap.id = generateId()
    roadmap.aiProvider = 'perplexity'
    roadmap.createdAt = new Date().toISOString()
    roadmap.progress = 0
    return roadmap
  } catch (parseError) {
    console.error('Failed to parse Perplexity response:', content)
    return createFallbackRoadmap(topic)
  }
}

async function enhanceWithYouTubeVideosDirect(roadmap) {
  console.log('🎥 Enhancing roadmap with YouTube videos...')

  try {
    for (const module of roadmap.modules) {
      for (const task of module.tasks) {
        if (task.resources?.youtubeSearch) {
          const videos = await searchYouTubeVideosDirect(task.resources.youtubeSearch)
          if (videos.length > 0) {
            task.resources.videos = videos
            delete task.resources.youtubeSearch
          }
        }
      }
    }
  } catch (error) {
    console.error('Error enhancing with YouTube videos:', error)
  }

  return roadmap
}

async function searchYouTubeVideosDirect(query) {
  if (!YOUTUBE_API_KEY) {
    console.warn('⚠️ YouTube API key not configured, skipping video search')
    return []
  }

  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=3&key=${YOUTUBE_API_KEY}`)

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`)
    }

    const data = await response.json()

    return data.items.map((item) => ({
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail: item.snippet.thumbnails.medium.url,
      channel: item.snippet.channelTitle,
      duration: 'Medium'
    }))
  } catch (error) {
    console.error('Error searching YouTube videos:', error)
    return []
  }
}

function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

function createFallbackRoadmap(topic) {
  console.log('🔄 Creating fallback roadmap for:', topic)
  
  const modules = [
    {
      id: '1',
      title: 'Getting Started',
      description: `Introduction to ${topic} fundamentals`,
      completed: false,
      difficulty: 'Easy',
      estimatedTime: '3 hours',
      tasks: [
        {
          id: '1-1',
          title: `${topic} Basics`,
          completed: false,
          difficulty: 'Easy',
          type: 'Theory',
          estimatedTime: '45 minutes',
          description: `Learn the fundamental concepts of ${topic}`,
          learningObjectives: ['Understand core principles', 'Learn key terminology'],
          prerequisites: ['Basic computer literacy'],
          resources: {
            articles: [`Introduction to ${topic}`, `${topic} concepts explained`],
            documentation: [`${topic} official documentation`],
            practice: ['Interactive tutorials'],
            videos: []
          }
        },
        {
          id: '1-2',
          title: `${topic} Tools and Setup`,
          completed: false,
          difficulty: 'Easy',
          type: 'Practice',
          estimatedTime: '30 minutes',
          description: `Set up your development environment for ${topic}`,
          learningObjectives: ['Configure development environment', 'Install necessary tools'],
          prerequisites: ['Completed basics'],
          resources: {
            articles: [`${topic} setup guide`],
            documentation: [`${topic} installation docs`],
            practice: ['Environment setup'],
            videos: []
          }
        }
      ]
    },
    {
      id: '2',
      title: 'Core Concepts',
      description: `Deep dive into ${topic} core concepts`,
      completed: false,
      difficulty: 'Medium',
      estimatedTime: '4 hours',
      tasks: [
        {
          id: '2-1',
          title: `Advanced ${topic} Concepts`,
          completed: false,
          difficulty: 'Medium',
          type: 'Theory',
          estimatedTime: '1 hour',
          description: `Explore advanced concepts and patterns in ${topic}`,
          learningObjectives: ['Master advanced concepts', 'Understand best practices'],
          prerequisites: ['Completed basics and setup'],
          resources: {
            articles: [`Advanced ${topic} patterns`, `${topic} best practices`],
            documentation: [`${topic} advanced guide`],
            practice: ['Concept exercises'],
            videos: []
          }
        },
        {
          id: '2-2',
          title: `${topic} Problem Solving`,
          completed: false,
          difficulty: 'Medium',
          type: 'Practice',
          estimatedTime: '2 hours',
          description: `Practice solving problems using ${topic}`,
          learningObjectives: ['Apply learned concepts', 'Develop problem-solving skills'],
          prerequisites: ['Understanding of core concepts'],
          resources: {
            articles: [`${topic} problem solving strategies`],
            documentation: [`${topic} examples`],
            practice: ['Practice problems', 'Coding challenges'],
            videos: []
          }
        }
      ]
    },
    {
      id: '3',
      title: 'Practical Application',
      description: `Apply your ${topic} knowledge in real projects`,
      completed: false,
      difficulty: 'Medium',
      estimatedTime: '5 hours',
      tasks: [
        {
          id: '3-1',
          title: `Build a ${topic} Project`,
          completed: false,
          difficulty: 'Medium',
          type: 'Project',
          estimatedTime: '3 hours',
          description: `Create a practical project using ${topic}`,
          learningObjectives: ['Apply knowledge practically', 'Build portfolio project'],
          prerequisites: ['Completed core concepts'],
          resources: {
            articles: [`${topic} project ideas`, `${topic} project tutorial`],
            documentation: [`${topic} project examples`],
            practice: ['Hands-on project building'],
            videos: []
          }
        }
      ]
    }
  ]

  return {
    id: generateId(),
    title: `${topic} Learning Path`,
    description: `A comprehensive learning roadmap for ${topic}. Start your journey with fundamentals and progress to practical applications.`,
    difficulty: 'beginner',
    estimatedDuration: '4-6 weeks',
    aiProvider: 'fallback',
    category: 'General',
    createdAt: new Date().toISOString(),
    progress: 0,
    modules
  }
}

// AI Services
export const aiService = {
  generateRoadmap: async (topic, userId) => {
    const response = await api.post('/ai/generate-roadmap', { topic, userId })
    return response.data
  },

  chat: async (message, context, userId) => {
    const response = await api.post('/ai/chat', { message, context, userId })
    return response.data
  },

  classifyTopic: async (topic) => {
    const response = await api.post('/ai/classify-topic', { topic })
    return response.data
  },

  improveRoadmap: async (roadmapId, feedback, userId) => {
    const response = await api.post('/ai/improve-roadmap', { roadmapId, feedback, userId })
    return response.data
  },
}

// Roadmap Services
export const roadmapService = {
  getUserRoadmaps: async (userId) => {
    return await apiCallWithFallback(
      () => api.get(`/roadmap/user/${userId}`),
      async () => {
        console.log('🗂️ Direct fallback: get user roadmaps')
        const roadmaps = JSON.parse(localStorage.getItem('ai-roadmap-roadmaps') || '[]')
        const safeRoadmaps = Array.isArray(roadmaps) ? roadmaps : []
        return { data: safeRoadmaps }
      }
    )
  },

  getRoadmap: async (roadmapId) => {
    const response = await api.get(`/roadmap/${roadmapId}`)
    return response.data
  },

  updateProgress: async (roadmapId, moduleId, taskId, completed, timeSpent) => {
    const response = await api.put(`/roadmap/${roadmapId}/progress`, {
      moduleId,
      taskId,
      completed,
      timeSpent,
    })
    return response.data
  },

  forkRoadmap: async (roadmapId, userId) => {
    const response = await api.post(`/roadmap/${roadmapId}/fork`, { userId })
    return response.data
  },

  getPublicRoadmaps: async (page = 1, limit = 10, category, difficulty) => {
    const response = await api.get('/roadmap/public/browse', {
      params: { page, limit, category, difficulty },
    })
    return response.data
  },

  updateVisibility: async (roadmapId, isPublic) => {
    const response = await api.put(`/roadmap/${roadmapId}/visibility`, { isPublic })
    return response.data
  },

  likeRoadmap: async (roadmapId, userId, action) => {
    const response = await api.post(`/roadmap/${roadmapId}/like`, { userId, action })
    return response.data
  },

  deleteRoadmap: async (roadmapId, userId) => {
    const response = await api.delete(`/roadmap/${roadmapId}`, { data: { userId } })
    return response.data
  },
}

// Auth Services
export const authService = {
  syncUser: async (supabaseId, email, name, profileImage) => {
    return await apiCallWithFallback(
      () => api.post('/auth/sync', { supabaseId, email, name, profileImage }),
      async () => {
        console.log('🔐 Direct fallback: auth sync')
        const userData = {
          success: true,
          user: {
            id: supabaseId,
            supabaseId: supabaseId,
            email: email,
            name: name,
            profileImage: profileImage || '',
            stats: getInitialUserStats()
          }
        }
        localStorage.setItem('ai-roadmap-user', JSON.stringify(userData.user))
        return { data: userData }
      }
    )
  },

  getProfile: async (supabaseId) => {
    return await apiCallWithFallback(
      () => api.get(`/auth/profile/${supabaseId}`),
      async () => {
        console.log('👤 Direct fallback: get profile')
        const storedUser = getStoredUser()
        const profile = JSON.parse(localStorage.getItem('ai-roadmap-profile') || '{}')

        const response = {
          name: storedUser?.name || '',
          email: storedUser?.email || '',
          bio: profile.bio || '',
          location: profile.location || '',
          githubUsername: profile.githubUsername || '',
          twitterUsername: profile.twitterUsername || '',
          joinDate: profile.joinDate || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          rank: null,
          learningGoals: profile.learningGoals || [],
          preferences: profile.preferences || {
            emailNotifications: true,
            weeklyDigest: true,
            achievementAlerts: true
          }
        }

        return { data: response }
      }
    )
  },
}

// User Services
export const userService = {
  updateProfile: async (supabaseId, updates) => {
    return await apiCallWithFallback(
      () => api.put(`/user/profile/${supabaseId}`, updates),
      async () => {
        console.log('👤 Direct fallback: update profile')
        const profile = JSON.parse(localStorage.getItem('ai-roadmap-profile') || '{}')
        const updatedProfile = { ...profile, ...updates }
        localStorage.setItem('ai-roadmap-profile', JSON.stringify(updatedProfile))
        return { data: { success: true, user: updatedProfile } }
      }
    )
  },

  updateApiKey: async (supabaseId, provider, apiKey) => {
    return await apiCallWithFallback(
      () => api.put(`/user/api-keys/${supabaseId}`, { provider, apiKey }),
      async () => {
        console.log('🔑 Direct fallback: update API key')
        return { data: { success: true } }
      }
    )
  },

  getStats: async (supabaseId) => {
    return await apiCallWithFallback(
      () => api.get(`/user/stats/${supabaseId}`),
      async () => {
        console.log('📊 Direct fallback: get stats')
        const storedUser = getStoredUser()
        const stats = storedUser?.stats || getInitialUserStats()

        const response = {
          stats,
          activeLearningDays: JSON.parse(localStorage.getItem('ai-roadmap-activity-days') || '[]'),
          lastActiveDate: localStorage.getItem('ai-roadmap-last-active'),
          streakStartDate: localStorage.getItem('ai-roadmap-streak-start')
        }

        return { data: response }
      }
    )
  },

  updateActivity: async (supabaseId, activityType, value) => {
    return await apiCallWithFallback(
      () => api.post(`/user/activity/${supabaseId}`, { activityType, value }),
      async () => {
        console.log('📈 Direct fallback: update activity')
        const today = new Date().toISOString().split('T')[0]
        const activityDays = JSON.parse(localStorage.getItem('ai-roadmap-activity-days') || '[]')
        if (!activityDays.includes(today)) {
          activityDays.push(today)
          localStorage.setItem('ai-roadmap-activity-days', JSON.stringify(activityDays))
        }
        return { data: { success: true, streak: 1 } }
      }
    )
  },

  getLeaderboard: async (type = 'xp', limit = 10) => {
    return await apiCallWithFallback(
      () => api.get('/user/leaderboard', { params: { type, limit } }),
      async () => {
        console.log('🏆 Direct fallback: get leaderboard')
        return { data: [] }
      }
    )
  },
}

// Progress Services
export const progressService = {
  getSummary: async (supabaseId) => {
    return await apiCallWithFallback(
      () => api.get(`/progress/${supabaseId}/summary`),
      async () => {
        console.log('📈 Direct fallback: progress summary')
        return { data: { totalRoadmaps: 0, activeRoadmaps: 0, completedTasks: 0 } }
      }
    )
  },

  getActivity: async (supabaseId, year) => {
    return await apiCallWithFallback(
      () => api.get(`/progress/${supabaseId}/activity`, { params: { year } }),
      async () => {
        console.log('📅 Direct fallback: activity data')
        const activityData = generateActivityData()
        return { data: activityData }
      }
    )
  },

  checkAchievements: async (supabaseId) => {
    return await apiCallWithFallback(
      () => api.post(`/progress/${supabaseId}/check-achievements`),
      async () => {
        console.log('🏆 Direct fallback: check achievements')
        const achievements = JSON.parse(localStorage.getItem('ai-roadmap-achievements') || '[]')
        return { data: { newAchievements: [], totalEarned: achievements.length } }
      }
    )
  },

  getAchievements: async (supabaseId) => {
    return await apiCallWithFallback(
      () => api.get(`/progress/${supabaseId}/achievements`),
      async () => {
        console.log('🎖️ Direct fallback: get achievements')
        const achievements = JSON.parse(localStorage.getItem('ai-roadmap-achievements') || '[]')
        const safeAchievements = Array.isArray(achievements) ? achievements : []
        return { data: safeAchievements }
      }
    )
  },
}

// Wrapper function to handle API calls with direct fallback
async function apiCallWithFallback(apiCall, fallbackHandler) {
  try {
    console.log('🔄 Attempting API call...')
    return await apiCall()
  } catch (error) {
    const message = error?.message || 'Unknown error'
    const code = error?.code || 'Unknown code'
    console.log('🚨 API call failed, using direct fallback:', message, code)

    if (message === 'Network Error' || code === 'ERR_NETWORK' || !error.response) {
      console.log('✅ Triggering direct fallback...')
      return await fallbackHandler()
    }
    throw error
  }
}

function getStoredUser() {
  try {
    const stored = localStorage.getItem('ai-roadmap-user')
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.error('Error parsing stored user:', error)
    return null
  }
}

function getInitialUserStats() {
  return {
    streak: 0,
    totalCompleted: 0,
    level: 1,
    experiencePoints: 0,
    weeklyGoal: 5,
    weeklyProgress: 0,
    roadmapsCompleted: 0,
    totalStudyTime: 0,
    globalRanking: null,
    attendedContests: 0,
    problemsSolved: { easy: 0, medium: 0, hard: 0, total: 0 }
  }
}

function generateActivityData() {
  const today = new Date()
  const activityData = []
  const activeDays = JSON.parse(localStorage.getItem('ai-roadmap-activity-days') || '[]')

  for (let i = 0; i < 365; i++) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const dateString = date.toISOString().split('T')[0]
    const isActive = activeDays.includes(dateString)

    activityData.push({
      date: dateString,
      tasksCompleted: isActive ? 1 : 0,
      activityLevel: isActive ? 1 : 0
    })
  }

  return {
    year: today.getFullYear(),
    totalDays: 365,
    activeDays: activeDays.length,
    currentStreak: calculateCurrentStreak(activeDays),
    activityData
  }
}

function calculateCurrentStreak(activeDays) {
  if (activeDays.length === 0) return 0

  const today = new Date().toISOString().split('T')[0]
  const sortedDays = activeDays.sort().reverse()

  let streak = 0
  let currentDate = new Date()

  for (const day of sortedDays) {
    const dayDate = currentDate.toISOString().split('T')[0]
    if (day === dayDate) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

// Helper function to update progress
export function updateProgressLocally(roadmapId, moduleId, taskId, completed) {
  const roadmaps = JSON.parse(localStorage.getItem('ai-roadmap-roadmaps') || '[]')
  const roadmapIndex = roadmaps.findIndex((r) => r.id === roadmapId)

  if (roadmapIndex === -1) return

  const roadmap = roadmaps[roadmapIndex]
  const module = roadmap.modules.find((m) => m.id === moduleId)

  if (!module) return

  const task = module.tasks.find((t) => t.id === taskId)

  if (!task) return

  const wasCompleted = task.completed

  task.completed = completed

  if (completed && !wasCompleted) {
    task.completedAt = new Date().toISOString()
    task.timeSpent = task.timeSpent || 0
  } else if (!completed && wasCompleted) {
    delete task.completedAt
  }

  const totalTasks = roadmap.modules.reduce((sum, m) => sum + m.tasks.length, 0)
  const completedTasks = roadmap.modules.reduce((sum, m) =>
    sum + m.tasks.filter((t) => t.completed).length, 0
  )
  roadmap.progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const user = getStoredUser()
  if (completed && !wasCompleted && user) {
    user.stats.totalCompleted += 1
    user.stats.weeklyProgress += 1
    user.stats.experiencePoints += 10

    if (task.difficulty) {
      const difficulty = task.difficulty.toLowerCase()
      if (user.stats.problemsSolved[difficulty] !== undefined) {
        user.stats.problemsSolved[difficulty] += 1
        user.stats.problemsSolved.total += 1
      }
    }

    const newLevel = Math.floor(user.stats.experiencePoints / 100) + 1
    user.stats.level = newLevel

    localStorage.setItem('ai-roadmap-user', JSON.stringify(user))

    const today = new Date().toISOString().split('T')[0]
    const activityDays = JSON.parse(localStorage.getItem('ai-roadmap-activity-days') || '[]')
    if (!activityDays.includes(today)) {
      activityDays.push(today)
      localStorage.setItem('ai-roadmap-activity-days', JSON.stringify(activityDays))
    }
    localStorage.setItem('ai-roadmap-last-active', new Date().toISOString())

    const completions = JSON.parse(localStorage.getItem('ai-roadmap-completions') || '[]')
    completions.push({
      id: `${roadmapId}-${moduleId}-${taskId}`,
      roadmapId,
      moduleId,
      taskId,
      completedAt: new Date().toISOString(),
      difficulty: task.difficulty,
      type: task.type
    })
    localStorage.setItem('ai-roadmap-completions', JSON.stringify(completions))
  } else if (!completed && wasCompleted && user) {
    user.stats.totalCompleted = Math.max(0, user.stats.totalCompleted - 1)
    user.stats.weeklyProgress = Math.max(0, user.stats.weeklyProgress - 1)
    user.stats.experiencePoints = Math.max(0, user.stats.experiencePoints - 10)

    if (task.difficulty) {
      const difficulty = task.difficulty.toLowerCase()
      if (user.stats.problemsSolved[difficulty] !== undefined) {
        user.stats.problemsSolved[difficulty] = Math.max(0, user.stats.problemsSolved[difficulty] - 1)
        user.stats.problemsSolved.total = Math.max(0, user.stats.problemsSolved.total - 1)
      }
    }

    const newLevel = Math.floor(user.stats.experiencePoints / 100) + 1
    user.stats.level = newLevel

    localStorage.setItem('ai-roadmap-user', JSON.stringify(user))

    const completions = JSON.parse(localStorage.getItem('ai-roadmap-completions') || '[]')
    const filteredCompletions = completions.filter((c) => c.id !== `${roadmapId}-${moduleId}-${taskId}`)
    localStorage.setItem('ai-roadmap-completions', JSON.stringify(filteredCompletions))
  }

  localStorage.setItem('ai-roadmap-roadmaps', JSON.stringify(roadmaps))

  console.log('📈 Progress updated:', {
    roadmapId,
    moduleId,
    taskId,
    completed,
    wasCompleted,
    isNewCompletion: completed && !wasCompleted,
    progress: roadmap.progress
  })
}

export default api
