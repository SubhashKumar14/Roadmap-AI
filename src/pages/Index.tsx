import { useState, useEffect } from "react"
import { ThemeProvider } from "@/components/ui/theme-provider"
import { Header } from "@/components/Header"
import { Dashboard } from "@/components/Dashboard"
import { RoadmapGenerator } from "@/components/RoadmapGenerator"
import { RoadmapView } from "@/components/RoadmapView"
import { Achievements } from "@/components/Achievements"
import { Profile } from "@/components/Profile"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Plus, Star, Flame, Target, Trophy, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth, AuthenticatedOnly, UnauthenticatedOnly } from "@/components/auth/DatabaseAuthProvider"
import { AuthCard } from "@/components/auth/AuthComponents"
import { databaseService } from "@/services/database"
import webSocketService from "@/services/websocket"
import realtimeService from "@/services/realtimeNew"

const Index = () => {
  const { user, loading } = useAuth()

  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [selectedRoadmap, setSelectedRoadmap] = useState<string | null>(null)
  const [showGenerator, setShowGenerator] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected')

  // User data state - starts empty, populated from backend only
  const [userStats, setUserStats] = useState({
    streak: 0,
    totalCompleted: 0,
    level: 1,
    experiencePoints: 0,
    activeLearningDays: [],
    weeklyGoal: 5, // Reasonable default
    weeklyProgress: 0,
    roadmapsCompleted: 0,
    totalStudyTime: 0,
    problemsSolved: {
      easy: 0,
      medium: 0,
      hard: 0,
      total: 0
    },
    globalRanking: null, // No ranking until earned
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

  const [achievements, setAchievements] = useState<any[]>([])

  const [apiKeys, setApiKeys] = useState({
    openai: "",
    gemini: "",
    perplexity: ""
  })

  const [roadmaps, setRoadmaps] = useState<any[]>([])

  // Initialize user data when authenticated
  useEffect(() => {
    if (!loading && user) {
      console.log('User authenticated:', user.id, user.email);
      initializeUserData()
      connectSocket()

      // Initialize real-time subscriptions with error handling
      try {
        realtimeService.initializeUserSubscriptions(user.id)
        setConnectionStatus(realtimeService.getConnectionStatus())
        console.log('✅ Real-time subscriptions initialized')
      } catch (error) {
        console.warn('⚠️ Could not initialize real-time subscriptions:', error)
        setConnectionStatus('error')
      }

      // Listen for real-time updates
      const handleProgressUpdate = (event: CustomEvent) => {
        console.log('📊 Real-time progress update received:', event.detail)
        // Refresh roadmaps data
        loadUserRoadmaps()
      }

      const handleStatsUpdate = (event: CustomEvent) => {
        console.log('📈 Real-time stats update received:', event.detail)
        // Update stats directly
        if (event.detail.stats) {
          setUserStats(event.detail.stats)
        }
      }

      window.addEventListener('progress-updated', handleProgressUpdate as EventListener)
      window.addEventListener('stats-updated', handleStatsUpdate as EventListener)

      return () => {
        window.removeEventListener('progress-updated', handleProgressUpdate as EventListener)
        window.removeEventListener('stats-updated', handleStatsUpdate as EventListener)
        realtimeService.cleanup()
        setConnectionStatus('disconnected')
      }
    } else if (!loading) {
      console.log('User not authenticated, showing landing page');
      setIsLoading(false)
    }
  }, [loading, user])

  // Load user roadmaps from real-time service
  const loadUserRoadmaps = async () => {
    if (!user?.id) return

    try {
      console.log('🗂️ Loading roadmaps from real-time service...');
      const roadmapsData = await realtimeService.getUserRoadmaps(user.id);
      setRoadmaps(Array.isArray(roadmapsData) ? roadmapsData : []);
      console.log('✅ User roadmaps loaded from real-time service:', roadmapsData.length);
    } catch (error: any) {
      const errorMsg = error?.message || error;
      console.error('❌ Error loading roadmaps from real-time service:', errorMsg);

      if (isTableMissingError(error)) {
        console.warn('📋 Database tables not set up, using empty roadmaps');
        setShowDatabaseSetup(true);
        setRoadmaps([]);
      } else {
        // Fallback to existing API service
        try {
          const fallbackData = await roadmapService.getUserRoadmaps(user.id);
          const safeRoadmaps = Array.isArray(fallbackData) ? fallbackData : [];
          setRoadmaps(safeRoadmaps);
          console.log('✅ User roadmaps loaded from fallback API service:', safeRoadmaps.length);
        } catch (fallbackError: any) {
          console.error('❌ Fallback roadmap loading failed:', fallbackError?.message || fallbackError);
          setRoadmaps([]);
          console.log('Using empty roadmaps array');
        }
      }
    }
  }

  const initializeUserData = async () => {
    try {
      console.log('🚀 Initializing user data for:', user!.id);
      console.log('📧 User email:', user!.email);
      console.log('👤 User name:', user!.user_metadata?.full_name || user!.email?.split('@')[0]);

      console.log('🔍 Checking connection status...');
      setConnectionStatus(realtimeService.getConnectionStatus());

      // Sync user with backend
      console.log('🔄 Syncing user with backend...');
      const syncResult = await authService.syncUser(
        user!.id,
        user!.email || "",
        user!.user_metadata?.full_name || user!.email?.split('@')[0] || "",
        user!.user_metadata?.avatar_url || ""
      );
      console.log('✅ User sync completed:', syncResult);

      // Load user data with individual error handling
      try {
        console.log('Loading user stats from real-time service...');
        const statsData = await realtimeService.getUserStats(user!.id);
        if (statsData) {
          setUserStats({
            streak: statsData.streak || 0,
            totalCompleted: statsData.total_completed || 0,
            level: statsData.level || 1,
            experiencePoints: statsData.experience_points || 0,
            activeLearningDays: statsData.active_learning_days || [],
            weeklyGoal: statsData.weekly_goal || 5,
            weeklyProgress: statsData.weekly_progress || 0,
            roadmapsCompleted: statsData.roadmaps_completed || 0,
            totalStudyTime: statsData.total_study_time || 0,
            problemsSolved: statsData.problems_solved || { easy: 0, medium: 0, hard: 0, total: 0 },
            globalRanking: statsData.global_ranking || null,
            attendedContests: statsData.attended_contests || 0
          });
          console.log('User stats loaded from real-time service:', statsData);
        } else {
          console.log('No stats found, keeping empty state');
        }
      } catch (statsError: any) {
        const errorMsg = statsError?.message || statsError;
        console.error('❌ Error loading stats from real-time service:', errorMsg);

        if (isTableMissingError(statsError)) {
          console.warn('📋 Database tables not set up, using fallback stats');
          setShowDatabaseSetup(true);
        } else {
          // Fallback to existing API service
          try {
            const fallbackStats = await userService.getStats(user!.id);
            setUserStats(fallbackStats.stats || fallbackStats);
            console.log('✅ Stats loaded from fallback API service');
          } catch (fallbackError: any) {
            console.error('❌ Fallback stats loading failed:', fallbackError?.message || fallbackError);
            console.log('Using empty stats state');
          }
        }
      }

      try {
        console.log('Loading user profile from real-time service...');
        const profileData = await realtimeService.getUserProfile(user!.id);
        if (profileData) {
          setUserProfile({
            name: profileData.name || user!.user_metadata?.full_name || user!.email?.split('@')[0] || "",
            email: profileData.email || user!.email || "",
            bio: profileData.bio || "",
            location: profileData.location || "",
            githubUsername: profileData.github_username || "",
            twitterUsername: profileData.twitter_username || "",
            joinDate: profileData.created_at ? new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            rank: null,
            learningGoals: profileData.learning_goals || [],
            preferences: profileData.preferences || {
              emailNotifications: true,
              weeklyDigest: true,
              achievementAlerts: true
            }
          });
          console.log('User profile loaded from real-time service:', profileData);
        } else {
          // Create initial profile if none exists
          const initialProfile = {
            name: user!.user_metadata?.full_name || user!.email?.split('@')[0] || "",
            email: user!.email || "",
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
          };
          setUserProfile(prev => ({
            ...prev,
            ...initialProfile,
            joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          }));

          // Sync profile to real-time service (only if database is set up)
          if (databaseStatus?.tablesExist) {
            try {
              await realtimeService.syncUserProfile(user!.id, initialProfile);
            } catch (syncError: any) {
              console.warn('Could not sync initial profile:', syncError?.message || syncError);
            }
          }
        }
      } catch (profileError: any) {
        const errorMsg = profileError?.message || profileError;
        console.error('❌ Error loading profile from real-time service:', errorMsg);

        if (isTableMissingError(profileError) || errorMsg.includes('Database tables not set up')) {
          console.warn('📋 Database tables not set up, using fallback profile');
          setShowDatabaseSetup(true);
          // Use auth data directly
          setUserProfile(prev => ({
            ...prev,
            name: user!.user_metadata?.full_name || user!.email?.split('@')[0] || "",
            email: user!.email || "",
            joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          }));
        } else {
          // Fallback to existing API service
          try {
            const fallbackProfile = await authService.getProfile(user!.id);
            setUserProfile(prev => ({
              ...prev,
              ...fallbackProfile,
              name: fallbackProfile.name || user!.user_metadata?.full_name || user!.email?.split('@')[0] || "",
              email: fallbackProfile.email || user!.email || ""
            }));
            console.log('✅ Profile loaded from fallback API service');
          } catch (fallbackError: any) {
            console.error('❌ Fallback profile loading failed:', fallbackError?.message || fallbackError);
            // Use minimal profile data from auth if loading fails
            setUserProfile(prev => ({
              ...prev,
              name: user!.user_metadata?.full_name || user!.email?.split('@')[0] || "",
              email: user!.email || "",
              joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            }));
          }
        }
      }

      // Load roadmaps using the dedicated function
      await loadUserRoadmaps();

      try {
        console.log('Loading user achievements...');
        const achievementsData = await progressService.getAchievements(user!.id);

        // Ensure achievementsData is an array
        const safeAchievementsData = Array.isArray(achievementsData) ? achievementsData : [];

        // Set achievements from backend data
        const processedAchievements = safeAchievementsData.map((achievement: any) => ({
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.category === 'streak' ? Flame :
                achievement.category === 'completion' ? Target :
                achievement.category === 'special' ? Trophy : Star,
          earned: achievement.isCompleted,
          earnedDate: achievement.earnedAt,
          category: achievement.category
        }));

        setAchievements(processedAchievements);
        console.log('User achievements loaded:', processedAchievements);
      } catch (achievementsError) {
        console.error('❌ Error loading achievements:', achievementsError);
        setAchievements([]); // Empty array if can't load
      }

      // Check if we're in cloud environment
      const isCloudEnvironment = window.location.hostname.includes('fly.dev') ||
                                window.location.hostname.includes('vercel.app') ||
                                window.location.hostname.includes('netlify.app');

      if (databaseStatus?.tablesExist) {
        toast({
          title: "Welcome back! 👋",
          description: "Your learning data has been loaded successfully with real-time sync enabled.",
        });
      } else {
        toast({
          title: "Welcome back! 👋",
          description: "Running in fallback mode. Set up database for full real-time features.",
        });
      }

    } catch (error) {
      console.error('❌ Error initializing user data:', error)

      // Keep current states if everything fails - no demo data
      setUserProfile(prev => ({
        ...prev,
        name: user!.user_metadata?.full_name || user!.email?.split('@')[0] || "",
        email: user!.email || "",
        joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }));

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
      socketService.connect(user.id)
      
      // Listen for real-time updates
      socketService.onProgressUpdate((data) => {
        toast({
          title: "Progress Synced! 📱",
          description: "Your progress has been updated across all devices.",
        })
      })

      socketService.onAchievementEarned((achievement) => {
        toast({
          title: "Achievement Unlocked! 🏆",
          description: `You earned "${achievement.title}"!`,
        })
      })
    }
  }

  const handleRoadmapGenerated = async (newRoadmap: any) => {
    try {
      // Save to real-time service first
      await realtimeService.saveRoadmap(newRoadmap);
      console.log('✅ Roadmap saved to real-time service');

      // Update local state
      setRoadmaps(prev => [newRoadmap, ...prev])
      setShowGenerator(false)
      setActiveTab("roadmaps")

      toast({
        title: "Roadmap Generated! 🎉",
        description: `Your "${newRoadmap.title}" roadmap is ready to start.`,
      })

      // Emit socket event
      socketService.emitRoadmapShared(newRoadmap)

      // Refresh roadmaps to ensure sync
      await loadUserRoadmaps();
    } catch (error: any) {
      console.error('❌ Error saving roadmap to real-time service:', error?.message || error);

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

  const handleTaskComplete = async (roadmapId: string, moduleId: string, taskId: string) => {
    try {
      // Check current task state to toggle it
      const currentRoadmap = roadmaps.find((r: any) => r.id === roadmapId);
      const currentModule = currentRoadmap?.modules.find((m: any) => m.id === moduleId);
      const currentTask = currentModule?.tasks.find((t: any) => t.id === taskId);
      const wasCompleted = currentTask?.completed || false;
      const newCompletedState = !wasCompleted;

      console.log('📝 User action - task completion:', {
        roadmapId,
        moduleId,
        taskId,
        wasCompleted,
        newState: newCompletedState,
        isRealCompletion: newCompletedState && !wasCompleted
      });

      // Try real-time service first, then fallback
      try {
        await realtimeService.updateProgress(roadmapId, moduleId, taskId, newCompletedState);
        console.log('✅ Real-time update successful');

        // Update stats in real-time if task was completed
        if (newCompletedState && !wasCompleted) {
          const updatedStats = {
            total_completed: userStats.totalCompleted + 1,
            weekly_progress: userStats.weeklyProgress + 1,
            experience_points: userStats.experiencePoints + 10,
            level: Math.floor((userStats.experiencePoints + 10) / 100) + 1
          };

          // Update problem counts based on difficulty
          if (currentTask?.difficulty) {
            const difficulty = currentTask.difficulty.toLowerCase();
            const problemsSolved = { ...userStats.problemsSolved };
            if (problemsSolved[difficulty] !== undefined) {
              problemsSolved[difficulty] += 1;
              problemsSolved.total += 1;
              updatedStats.problems_solved = problemsSolved;
            }
          }

          await realtimeService.updateStats(updatedStats);
          await userService.updateActivity(user!.id, 'task_completed');
        }
      } catch (realtimeError: any) {
        console.log('🌐 Real-time service unavailable:', realtimeError?.message || realtimeError);
        try {
          await roadmapService.updateProgress(roadmapId, moduleId, taskId, newCompletedState);
          if (newCompletedState && !wasCompleted) {
            await userService.updateActivity(user!.id, 'task_completed');
            await progressService.checkAchievements(user!.id);
          }
          console.log('✅ Fallback update successful');
        } catch (fallbackError: any) {
          console.log('🌐 All services unavailable, using local storage:', fallbackError?.message || fallbackError);
          updateProgressLocally(roadmapId, moduleId, taskId, newCompletedState);
        }
      }

      // Update local state
      setRoadmaps(prev => prev.map((roadmap: any) => {
        if (roadmap.id === roadmapId) {
          const updatedModules = roadmap.modules.map((module: any) => {
            if (module.id === moduleId) {
              const updatedTasks = module.tasks.map((task: any) =>
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
          const totalTasks = updatedModules.reduce((sum: number, m: any) => sum + m.tasks.length, 0)
          const completedTasks = updatedModules.reduce((sum: number, m: any) =>
            sum + m.tasks.filter((t: any) => t.completed).length, 0
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
          };

          // Update problem counts based on difficulty
          if (currentTask?.difficulty) {
            const difficulty = currentTask.difficulty.toLowerCase();
            if (newStats.problemsSolved[difficulty] !== undefined) {
              newStats.problemsSolved[difficulty] += 1;
              newStats.problemsSolved.total += 1;
            }
          }

          return newStats;
        });

        console.log('📊 Real task completion recorded - stats updated');
      } else if (!newCompletedState && wasCompleted) {
        // Subtract stats when unchecking a completed task
        setUserStats(prev => {
          const newStats = {
            ...prev,
            totalCompleted: Math.max(0, prev.totalCompleted - 1),
            weeklyProgress: Math.max(0, prev.weeklyProgress - 1),
            experiencePoints: Math.max(0, prev.experiencePoints - 10),
            level: Math.floor(Math.max(0, prev.experiencePoints - 10) / 100) + 1
          };

          // Update problem counts
          if (currentTask?.difficulty) {
            const difficulty = currentTask.difficulty.toLowerCase();
            if (newStats.problemsSolved[difficulty] !== undefined) {
              newStats.problemsSolved[difficulty] = Math.max(0, newStats.problemsSolved[difficulty] - 1);
              newStats.problemsSolved.total = Math.max(0, newStats.problemsSolved.total - 1);
            }
          }

          return newStats;
        });

        console.log('📊 Task unchecked - stats decremented');
      }

      toast({
        title: newCompletedState ? "Task Completed! ✅" : "Task Unchecked! ⬜",
        description: newCompletedState && !wasCompleted ?
          "Great progress! Real completion recorded." :
          newCompletedState ? "Task was already completed." :
          "Task marked as incomplete.",
      })

      // Emit progress update
      socketService.emitProgressUpdate({
        roadmapId,
        moduleId,
        taskId,
        completed: newCompletedState,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('❌ Error updating task:', error)
      toast({
        title: "Update Failed",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleModuleComplete = (roadmapId: string, moduleId: string) => {
    setRoadmaps(prev => prev.map((roadmap: any) => {
      if (roadmap.id === roadmapId) {
        const updatedModules = roadmap.modules.map((module: any) => 
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

  const handleApiKeyUpdate = async (provider: string, key: string) => {
    try {
      if (user?.id) {
        await userService.updateApiKey(user.id, provider, key)
      }
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

  const handleProfileUpdate = async (updatedProfile: any) => {
    try {
      if (user?.id) {
        // Try real-time service first
        try {
          await realtimeService.syncUserProfile(user.id, updatedProfile);
          console.log('✅ Profile updated in real-time service');
        } catch (realtimeError: any) {
          console.log('🌐 Real-time service unavailable:', realtimeError?.message || realtimeError);
          await userService.updateProfile(user.id, updatedProfile);
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
      const roadmap = roadmaps.find((r: any) => r.id === selectedRoadmap)
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
                {roadmaps.map((roadmap: any) => (
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
                          <span>{roadmap.estimatedDuration}</span>
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
            <p className="text-muted-foreground">Loading your learning journey...</p>
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
        ) : showDatabaseSetup ? (
          <div className="container mx-auto py-6">
            <DatabaseSetupCard />
            <div className="mt-8 text-center">
              <Button
                variant="outline"
                onClick={() => setShowDatabaseSetup(false)}
              >
                Continue with Limited Features
              </Button>
            </div>
          </div>
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
