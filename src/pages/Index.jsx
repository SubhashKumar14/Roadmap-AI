import { useState, useEffect } from "react"
import { ThemeProvider } from "../components/ui/theme-provider"
import { Header } from "../components/Header"
import { Dashboard } from "../components/Dashboard"
import { RoadmapGenerator } from "../components/RoadmapGenerator"
import { RoadmapView } from "../components/RoadmapView"
import { Achievements } from "../components/Achievements"
import { Profile } from "../components/Profile"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { BookOpen, Plus, Star, Flame, Target, Trophy, Zap } from "lucide-react"
import { useToast } from "../hooks/use-toast"
import { useAuth, AuthenticatedOnly, UnauthenticatedOnly } from "../components/auth/DatabaseAuthProvider.jsx"
import { AuthCard } from "../components/auth/AuthComponents.jsx"
import { databaseService } from "../services/database.js"
import webSocketService from "../services/websocket.js"
import realtimeService from "../services/realtime.js"

const Index = () => {
  const { user, loading } = useAuth()

  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [selectedRoadmap, setSelectedRoadmap] = useState(null)
  const [showGenerator, setShowGenerator] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')

  // User data state - starts empty, populated from Qdrant only
  const [userStats, setUserStats] = useState({
    streak: 0,
    totalCompleted: 0,
    level: 1,
    experiencePoints: 0,
    activeLearningDays: [],
    weeklyGoal: 5,
    weeklyProgress: 0,
    roadmapsCompleted: 0,
    totalStudyTime: 0,
    problemsSolved: {
      easy: 0,
      medium: 0,
      hard: 0,
      total: 0
    },
    globalRanking: null,
    attendedContests: 0
  })

  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
    bio: "",
    location: "",
    githubUsername: "",
    twitterUsername: "",
    joinDate: "",
    rank: null,
    learningGoals: [],
    preferences: {
      emailNotifications: true,
      weeklyDigest: true,
      achievementAlerts: true
    }
  })

  const [achievements, setAchievements] = useState([])
  const [apiKeys, setApiKeys] = useState({
    openai: "",
    gemini: "",
    perplexity: ""
  })
  const [roadmaps, setRoadmaps] = useState([])

  // Initialize user data when authenticated
  useEffect(() => {
    if (!loading && user) {
      console.log('User authenticated with Qdrant session:', user.id, user.email)
      initializeUserData()
      connectSocket()

      // Initialize real-time subscriptions with error handling
      const initializeRealtime = async () => {
        try {
          await realtimeService.initializeUserSubscriptions(user.id)
          setConnectionStatus(realtimeService.getConnectionStatus())
          console.log('✅ Real-time subscriptions initialized with Qdrant backend')
        } catch (error) {
          console.warn('⚠️ Could not initialize real-time subscriptions:', error)
          setConnectionStatus('error')
        }
      }
      
      initializeRealtime()

      // Listen for real-time updates
      const handleProgressUpdate = (event) => {
        console.log('📊 Real-time progress update received:', event.detail)
        loadUserRoadmaps()
      }

      const handleStatsUpdate = (event) => {
        console.log('📈 Real-time stats update received:', event.detail)
        if (event.detail.stats) {
          setUserStats(event.detail.stats)
        }
      }

      window.addEventListener('progress-updated', handleProgressUpdate)
      window.addEventListener('stats-updated', handleStatsUpdate)

      return () => {
        window.removeEventListener('progress-updated', handleProgressUpdate)
        window.removeEventListener('stats-updated', handleStatsUpdate)
        realtimeService.cleanup()
        setConnectionStatus('disconnected')
      }
    } else if (!loading) {
      console.log('User not authenticated, showing landing page')
      setIsLoading(false)
    }
  }, [loading, user])

  // Load user roadmaps from Qdrant database
  const loadUserRoadmaps = async () => {
    if (!user?.id) return

    try {
      console.log('🗂️ Loading roadmaps from Qdrant database...')
      const roadmapsData = await realtimeService.getUserRoadmaps(user.id)
      setRoadmaps(Array.isArray(roadmapsData) ? roadmapsData : [])
      console.log('✅ User roadmaps loaded from Qdrant:', roadmapsData.length)
    } catch (error) {
      const errorMsg = error?.message || error
      console.error('❌ Error loading roadmaps from Qdrant:', errorMsg)
      console.warn('📋 Error loading roadmaps, using empty state')
      setRoadmaps([])
    }
  }

  const initializeUserData = async () => {
    try {
      console.log('🚀 Initializing user data with Qdrant for:', user.id)
      console.log('📧 User email:', user.email)
      console.log('👤 User name:', user.name)
      console.log('⏰ Session expires:', new Date(user.sessionExpiry).toLocaleString())

      console.log('🔍 Checking connection status...')
      setConnectionStatus(realtimeService.getConnectionStatus())

      console.log('🔄 User already authenticated with Qdrant database')

      // Load user data with individual error handling
      try {
        console.log('Loading user stats from Qdrant...')
        const statsData = await realtimeService.getUserStats(user.id)
        if (statsData) {
          setUserStats({
            streak: statsData.streak || 0,
            totalCompleted: statsData.totalCompleted || 0,
            level: statsData.level || 1,
            experiencePoints: statsData.experiencePoints || 0,
            activeLearningDays: [],
            weeklyGoal: statsData.weeklyGoal || 5,
            weeklyProgress: statsData.weeklyProgress || 0,
            roadmapsCompleted: statsData.roadmapsCompleted || 0,
            totalStudyTime: statsData.totalStudyTime || 0,
            problemsSolved: statsData.problemsSolved || { easy: 0, medium: 0, hard: 0, total: 0 },
            globalRanking: statsData.globalRanking || null,
            attendedContests: statsData.attendedContests || 0
          })
          console.log('User stats loaded from Qdrant:', statsData)
        } else {
          console.log('No stats found in Qdrant, keeping empty state')
        }
      } catch (statsError) {
        const errorMsg = statsError?.message || statsError
        console.error('❌ Error loading stats from Qdrant:', errorMsg)
        console.warn('📋 Error loading stats, using empty state')
      }

      try {
        console.log('Loading user profile from Qdrant...')
        const profileData = await realtimeService.getUserProfile(user.id)
        if (profileData) {
          setUserProfile({
            name: profileData.name || user.name || "",
            email: profileData.email || user.email || "",
            bio: profileData.bio || "",
            location: profileData.location || "",
            githubUsername: profileData.githubUsername || "",
            twitterUsername: profileData.twitterUsername || "",
            joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            rank: null,
            learningGoals: profileData.learningGoals || [],
            preferences: profileData.preferences || {
              emailNotifications: true,
              weeklyDigest: true,
              achievementAlerts: true
            }
          })
          console.log('User profile loaded from Qdrant:', profileData)
        } else {
          // Create initial profile if none exists
          const initialProfile = {
            name: user.name || "",
            email: user.email || "",
            bio: "",
            location: "",
            githubUsername: "",
            twitterUsername: "",
            learningGoals: [],
            preferences: {
              emailNotifications: true,
              weeklyDigest: true,
              achievementAlerts: true
            }
          }
          setUserProfile(prev => ({
            ...prev,
            ...initialProfile,
            joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          }))

          // Sync profile to Qdrant
          try {
            await realtimeService.syncUserProfile(user.id, initialProfile)
          } catch (syncError) {
            console.warn('Could not sync initial profile to Qdrant:', syncError?.message || syncError)
          }
        }
      } catch (profileError) {
        const errorMsg = profileError?.message || profileError
        console.error('❌ Error loading profile from Qdrant:', errorMsg)
        console.warn('📋 Error loading profile, using auth data')
        setUserProfile(prev => ({
          ...prev,
          name: user.name || "",
          email: user.email || "",
          joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }))
      }

      // Load roadmaps using the dedicated function
      await loadUserRoadmaps()

      // Set default achievements for now
      setAchievements([])
      console.log('Using empty achievements array')

      toast({
        title: "Welcome back! 👋",
        description: "Your learning data has been loaded from Qdrant database.",
      })

    } catch (error) {
      console.error('❌ Error initializing user data:', error)

      // Keep current states if everything fails
      setUserProfile(prev => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
        joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }))

      toast({
        title: "Connection Issue",
        description: "Some data couldn't be loaded. Your progress will sync when connection is restored.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const connectSocket = () => {
    if (user?.id) {
      // WebSocket connection is handled by realtimeService
      console.log('WebSocket connection managed by real-time service with Qdrant backend')
    }
  }

  const handleRoadmapGenerated = async (newRoadmap) => {
    try {
      // Save to Qdrant via real-time service
      await realtimeService.saveRoadmap(newRoadmap)
      console.log('✅ Roadmap saved to Qdrant database')

      // Update local state
      setRoadmaps(prev => [newRoadmap, ...prev])
      setShowGenerator(false)
      setActiveTab("roadmaps")

      toast({
        title: "Roadmap Generated! 🎉",
        description: `Your "${newRoadmap.title}" roadmap is ready to start.`,
      })

      // Real-time sync handled by realtimeService

      // Refresh roadmaps to ensure sync
      await loadUserRoadmaps()
    } catch (error) {
      console.error('❌ Error saving roadmap to Qdrant:', error?.message || error)

      // Fallback to local state update only
      setRoadmaps(prev => [newRoadmap, ...prev])
      setShowGenerator(false)
      setActiveTab("roadmaps")

      toast({
        title: "Roadmap Generated! 🎉",
        description: `Your "${newRoadmap.title}" roadmap is ready. Note: Real-time sync unavailable.`,
        variant: "default"
      })
    }
  }

  const handleTaskComplete = async (roadmapId, moduleId, taskId) => {
    try {
      // Check current task state to toggle it
      const currentRoadmap = roadmaps.find((r) => r.id === roadmapId)
      const currentModule = currentRoadmap?.modules.find((m) => m.id === moduleId)
      const currentTask = currentModule?.tasks.find((t) => t.id === taskId)
      const wasCompleted = currentTask?.completed || false
      const newCompletedState = !wasCompleted

      console.log('📝 User action - task completion:', {
        roadmapId,
        moduleId,
        taskId,
        wasCompleted,
        newState: newCompletedState,
        isRealCompletion: newCompletedState && !wasCompleted
      })

      // Try Qdrant real-time service first
      try {
        await realtimeService.updateProgress(roadmapId, moduleId, taskId, newCompletedState)
        console.log('✅ Qdrant real-time update successful')

        // Update stats in Qdrant if task was completed
        if (newCompletedState && !wasCompleted) {
          const updatedStats = {
            totalCompleted: userStats.totalCompleted + 1,
            weeklyProgress: userStats.weeklyProgress + 1,
            experiencePoints: userStats.experiencePoints + 10,
            level: Math.floor((userStats.experiencePoints + 10) / 100) + 1
          }

          // Update problem counts based on difficulty
          if (currentTask?.difficulty) {
            const difficulty = currentTask.difficulty.toLowerCase()
            const problemsSolved = { ...userStats.problemsSolved }
            if (problemsSolved[difficulty] !== undefined) {
              problemsSolved[difficulty] += 1
              problemsSolved.total += 1
              updatedStats.problemsSolved = problemsSolved
            }
          }

          await realtimeService.updateStats(updatedStats)
          // Activity tracking handled by realtimeService
        }
      } catch (realtimeError) {
        console.log('🌐 Qdrant real-time service unavailable:', realtimeError?.message || realtimeError)
        console.log('🌐 Using local progress tracking only')
      }

      // Update local state
      setRoadmaps(prev => prev.map((roadmap) => {
        if (roadmap.id === roadmapId) {
          const updatedModules = roadmap.modules.map((module) => {
            if (module.id === moduleId) {
              const updatedTasks = module.tasks.map((task) =>
                task.id === taskId ? {
                  ...task,
                  completed: newCompletedState,
                  completedAt: newCompletedState ? new Date().toISOString() : undefined
                } : task
              )
              return { ...module, tasks: updatedTasks }
            }
            return module
          })

          // Calculate progress
          const totalTasks = updatedModules.reduce((sum, m) => sum + m.tasks.length, 0)
          const completedTasks = updatedModules.reduce((sum, m) =>
            sum + m.tasks.filter((t) => t.completed).length, 0
          )
          const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

          return { ...roadmap, modules: updatedModules, progress }
        }
        return roadmap
      }))

      // Update user stats ONLY for actual new completions
      if (newCompletedState && !wasCompleted) {
        setUserStats(prev => {
          const newStats = {
            ...prev,
            totalCompleted: prev.totalCompleted + 1,
            weeklyProgress: prev.weeklyProgress + 1,
            experiencePoints: prev.experiencePoints + 10,
            level: Math.floor((prev.experiencePoints + 10) / 100) + 1
          }

          // Update problem counts based on difficulty
          if (currentTask?.difficulty) {
            const difficulty = currentTask.difficulty.toLowerCase()
            if (newStats.problemsSolved[difficulty] !== undefined) {
              newStats.problemsSolved[difficulty] += 1
              newStats.problemsSolved.total += 1
            }
          }

          return newStats
        })

        console.log('📊 Real task completion recorded - stats updated')
      } else if (!newCompletedState && wasCompleted) {
        // Subtract stats when unchecking a completed task
        setUserStats(prev => {
          const newStats = {
            ...prev,
            totalCompleted: Math.max(0, prev.totalCompleted - 1),
            weeklyProgress: Math.max(0, prev.weeklyProgress - 1),
            experiencePoints: Math.max(0, prev.experiencePoints - 10),
            level: Math.floor(Math.max(0, prev.experiencePoints - 10) / 100) + 1
          }

          // Update problem counts
          if (currentTask?.difficulty) {
            const difficulty = currentTask.difficulty.toLowerCase()
            if (newStats.problemsSolved[difficulty] !== undefined) {
              newStats.problemsSolved[difficulty] = Math.max(0, newStats.problemsSolved[difficulty] - 1)
              newStats.problemsSolved.total = Math.max(0, newStats.problemsSolved.total - 1)
            }
          }

          return newStats
        })

        console.log('📊 Task unchecked - stats decremented')
      }

      toast({
        title: newCompletedState ? "Task Completed! ✅" : "Task Unchecked! ⬜",
        description: newCompletedState && !wasCompleted ?
          "Great progress! Real completion recorded." :
          newCompletedState ? "Task was already completed." :
          "Task marked as incomplete.",
      })

      // Real-time progress sync handled by realtimeService

    } catch (error) {
      console.error('❌ Error updating task:', error)
      toast({
        title: "Update Failed",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleModuleComplete = (roadmapId, moduleId) => {
    setRoadmaps(prev => prev.map((roadmap) => {
      if (roadmap.id === roadmapId) {
        const updatedModules = roadmap.modules.map((module) => 
          module.id === moduleId ? { ...module, completed: true } : module
        )
        return { ...roadmap, modules: updatedModules }
      }
      return roadmap
    }))

    toast({
      title: "Module Completed! 🏆",
      description: "Excellent work! You've mastered this module.",
    })
  }

  const handleApiKeyUpdate = async (provider, key) => {
    try {
      // API key management handled by backend
      setApiKeys(prev => ({ ...prev, [provider]: key }))
      toast({
        title: "API Key Updated",
        description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} API key has been saved securely.`,
      })
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update API key. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleProfileUpdate = async (updatedProfile) => {
    try {
      if (user?.id) {
        // Try real-time service first
        try {
          await realtimeService.syncUserProfile(user.id, updatedProfile)
          console.log('✅ Profile updated in Qdrant database')
        } catch (realtimeError) {
          console.log('🌐 Real-time service unavailable:', realtimeError?.message || realtimeError)
          // Profile updates will be handled by database service
        }
      }
      setUserProfile(updatedProfile)
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  const renderContent = () => {
    if (selectedRoadmap) {
      const roadmap = roadmaps.find((r) => r.id === selectedRoadmap)
      if (!roadmap) return null
      
      return (
        <RoadmapView
          roadmap={roadmap}
          onTaskComplete={(moduleId, taskId) => handleTaskComplete(selectedRoadmap, moduleId, taskId)}
          onModuleComplete={(moduleId) => handleModuleComplete(selectedRoadmap, moduleId)}
        />
      )
    }

    if (showGenerator) {
      return <RoadmapGenerator onRoadmapGenerated={handleRoadmapGenerated} />
    }

    switch (activeTab) {
      case "dashboard":
        return <Dashboard userStats={userStats} roadmaps={roadmaps} />
      
      case "roadmaps":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">My Roadmaps</h2>
                <p className="text-muted-foreground">Manage your learning paths</p>
              </div>
              <Button onClick={() => setShowGenerator(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Generate New Roadmap
              </Button>
            </div>
            
            {roadmaps.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No roadmaps yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Generate your first AI-powered learning roadmap to get started
                  </p>
                  <Button onClick={() => setShowGenerator(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Roadmap
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roadmaps.map((roadmap) => (
                  <Card 
                    key={roadmap.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setSelectedRoadmap(roadmap.id)}
                  >
                    <div className="p-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold line-clamp-2">{roadmap.title}</h3>
                          <div className="text-right">
                            <div className="text-sm font-medium">{Math.round(roadmap.progress || 0)}%</div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {roadmap.description}
                        </p>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${roadmap.progress || 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{roadmap.modules?.length || 0} modules</span>
                          <span>{roadmap.estimated_duration}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )
      
      case "achievements":
        return <Achievements userStats={userStats} />
      
      case "profile":
        return (
          <Profile
            userProfile={userProfile}
            userStats={userStats}
            achievements={achievements}
            apiKeys={apiKeys}
            onProfileUpdate={handleProfileUpdate}
            onApiKeyUpdate={handleApiKeyUpdate}
          />
        )
      
      default:
        return <Dashboard userStats={userStats} roadmaps={roadmaps} />
    }
  }

  if (loading || isLoading) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="ai-roadmap-theme">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground">Loading your learning journey from Qdrant...</p>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="ai-roadmap-theme">
      <div className="min-h-screen bg-background">
        {!user ? (
          <AuthCard />
        ) : (
          <>
            <Header
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab)
                setSelectedRoadmap(null)
                setShowGenerator(false)
              }}
              userStats={userStats}
            />

            <main className="container mx-auto py-6">
              {selectedRoadmap && (
                <div className="mb-6">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedRoadmap(null)}
                    className="mb-4"
                  >
                    ← Back to Roadmaps
                  </Button>
                </div>
              )}

              {renderContent()}
            </main>
          </>
        )}
      </div>
    </ThemeProvider>
  )
}

export default Index
