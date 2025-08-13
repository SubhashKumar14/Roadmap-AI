import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  User, 
  Key, 
  Settings, 
  Trophy, 
  Calendar,
  Github,
  Twitter,
  MapPin,
  Mail,
  Star,
  Flame,
  Target,
  Brain,
  Sparkles,
  Search,
  Eye,
  EyeOff,
  Save,
  Edit
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth/DatabaseAuthProvider"
import { userService, progressService } from "@/services/api"
import { ContributionCalendar } from "@/components/ContributionCalendar"

interface ProfileProps {
  userProfile: any
  userStats: any
  achievements: any[]
  apiKeys: any
  onProfileUpdate: (profile: any) => void
  onApiKeyUpdate: (provider: string, key: string) => void
}

export function Profile({ 
  userProfile, 
  userStats, 
  achievements, 
  apiKeys, 
  onProfileUpdate, 
  onApiKeyUpdate 
}: ProfileProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState(userProfile)
  const [showApiKeys, setShowApiKeys] = useState({
    openai: false,
    gemini: false,
    perplexity: false
  })
  const [tempApiKeys, setTempApiKeys] = useState(apiKeys)
  const [activityData, setActivityData] = useState<Array<{
    date: string
    count: number
    level: number
  }>>([])
  const [isLoadingActivity, setIsLoadingActivity] = useState(false)

  useEffect(() => {
    setEditedProfile(userProfile)
  }, [userProfile])

  useEffect(() => {
    setTempApiKeys(apiKeys)
  }, [apiKeys])

  // Load activity data when component mounts
  useEffect(() => {
    if (user?.id) {
      loadActivityData()
    }
  }, [user?.id])

  const loadActivityData = async () => {
    if (!user?.id) return

    try {
      setIsLoadingActivity(true)
      const activity = await progressService.getActivity(user.id)

      // Transform backend data to component format
      const formattedActivity = activity.activityData?.map((day: any) => ({
        date: day.date,
        count: day.tasksCompleted || 0,
        level: day.activityLevel || 0
      })) || []

      setActivityData(formattedActivity)
    } catch (error) {
      console.error('Error loading activity data:', error)
    } finally {
      setIsLoadingActivity(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      if (user?.id) {
        await userService.updateProfile(user.id, editedProfile)
      }
      onProfileUpdate(editedProfile)
      setIsEditing(false)
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

  const handleSaveApiKey = async (provider: string) => {
    try {
      if (user?.id) {
        await userService.updateApiKey(user.id, provider, tempApiKeys[provider])
      }
      onApiKeyUpdate(provider, tempApiKeys[provider])
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

  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }))
  }

  const providerInfo = {
    openai: {
      icon: Brain,
      name: "OpenAI",
      description: "For technical and programming roadmaps",
      color: "text-green-600",
      placeholder: "sk-..."
    },
    gemini: {
      icon: Sparkles,
      name: "Google Gemini",
      description: "For creative and design roadmaps",
      color: "text-blue-600",
      placeholder: "AIza..."
    },
    perplexity: {
      icon: Search,
      name: "Perplexity AI",
      description: "For research and current trends",
      color: "text-purple-600",
      placeholder: "pplx-..."
    }
  }

  const earnedAchievements = achievements.filter(a => a.earned)
  const totalAchievements = achievements.length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user?.imageUrl || userProfile.profileImage} />
              <AvatarFallback className="text-lg">
                {userProfile.name?.charAt(0) || user?.firstName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{userProfile.name}</h1>
                  <p className="text-muted-foreground flex items-center space-x-1">
                    <Mail className="h-4 w-4" />
                    <span>{userProfile.email}</span>
                  </p>
                </div>
                <Button
                  variant={isEditing ? "default" : "outline"}
                  onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
                  className="flex items-center space-x-2"
                >
                  {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                  <span>{isEditing ? "Save" : "Edit"}</span>
                </Button>
              </div>
              
              {userProfile.bio && (
                <p className="text-sm text-muted-foreground">{userProfile.bio}</p>
              )}
              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                {userProfile.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{userProfile.location}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {userProfile.joinDate}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Trophy className="h-3 w-3" />
                  <span>Level {userStats.level}</span>
                </Badge>
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Flame className="h-3 w-3" />
                  <span>{userStats.streak} day streak</span>
                </Badge>
                <Badge variant="outline">
                  Rank #{userProfile.rank?.toLocaleString()}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Activity</span>
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="flex items-center space-x-2">
            <Key className="h-4 w-4" />
            <span>API Keys</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center space-x-2">
            <Trophy className="h-4 w-4" />
            <span>Achievements</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your profile information and social links
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={editedProfile.name}
                    onChange={(e) => setEditedProfile(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editedProfile.location || ''}
                    onChange={(e) => setEditedProfile(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="City, Country"
                    disabled={!isEditing}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={editedProfile.bio || ''}
                  onChange={(e) => setEditedProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="github">GitHub Username</Label>
                  <div className="flex items-center space-x-2">
                    <Github className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="github"
                      value={editedProfile.githubUsername || ''}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, githubUsername: e.target.value }))}
                      placeholder="username"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter Username</Label>
                  <div className="flex items-center space-x-2">
                    <Twitter className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="twitter"
                      value={editedProfile.twitterUsername || ''}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, twitterUsername: e.target.value }))}
                      placeholder="username"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Learning Goals */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Goals</CardTitle>
              <CardDescription>
                What do you want to achieve in your learning journey?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {userProfile.learningGoals?.map((goal: string, index: number) => (
                  <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                    <Target className="h-3 w-3" />
                    <span>{goal}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Learning Activity</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Track your daily learning progress and maintain your streak. Just like on LeetCode!
              </p>

              {isLoadingActivity ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading your activity...</p>
                  </CardContent>
                </Card>
              ) : (
                <ContributionCalendar
                  contributionData={activityData}
                  currentStreak={userStats.streak}
                  longestStreak={userStats.streak} // You might want to track this separately
                  totalContributions={userStats.totalCompleted}
                  year={new Date().getFullYear()}
                />
              )}
            </div>

            {/* Additional Activity Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold text-green-600">{userStats.totalCompleted}</div>
                  <div className="text-sm text-muted-foreground">Total Tasks</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold text-blue-600">{userStats.roadmapsCompleted}</div>
                  <div className="text-sm text-muted-foreground">Roadmaps Completed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold text-purple-600">{Math.round(userStats.totalStudyTime / 60)}h</div>
                  <div className="text-sm text-muted-foreground">Study Time</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Provider API Keys</CardTitle>
              <CardDescription>
                Add your API keys to use your own quota for AI roadmap generation. 
                When rate limits are reached, these keys will be used instead of the default ones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(providerInfo).map(([provider, info]) => (
                <div key={provider} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-muted ${info.color}`}>
                        <info.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-medium">{info.name}</h3>
                        <p className="text-sm text-muted-foreground">{info.description}</p>
                      </div>
                    </div>
                    <Badge variant={tempApiKeys[provider] ? "default" : "secondary"}>
                      {tempApiKeys[provider] ? "Configured" : "Not Set"}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`${provider}-key`}>API Key</Label>
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <Input
                          id={`${provider}-key`}
                          type={showApiKeys[provider as keyof typeof showApiKeys] ? "text" : "password"}
                          value={tempApiKeys[provider] || ''}
                          onChange={(e) => setTempApiKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                          placeholder={info.placeholder}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => toggleApiKeyVisibility(provider)}
                        >
                          {showApiKeys[provider as keyof typeof showApiKeys] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Button
                        onClick={() => handleSaveApiKey(provider)}
                        disabled={!tempApiKeys[provider] || tempApiKeys[provider] === apiKeys[provider]}
                        size="sm"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">🔒 Security Note</h4>
                <p className="text-sm text-muted-foreground">
                  Your API keys are encrypted and stored securely. They are only used when our default quota is exhausted 
                  or when you specifically request to use your own keys. We never share or misuse your API keys.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Your Achievements</span>
                <Badge variant="outline">
                  {earnedAchievements.length} / {totalAchievements}
                </Badge>
              </CardTitle>
              <CardDescription>
                Celebrate your learning milestones and unlock new badges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement) => {
                  const Icon = achievement.icon
                  return (
                    <div
                      key={achievement.id}
                      className={`p-4 rounded-lg border transition-all ${
                        achievement.earned 
                          ? 'border-primary bg-primary/5 shadow-glow' 
                          : 'border-border opacity-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-lg ${
                          achievement.earned 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{achievement.title}</div>
                          <div className="text-sm text-muted-foreground">{achievement.description}</div>
                          {achievement.earned && achievement.earnedDate && (
                            <div className="text-xs text-primary font-medium mt-1">
                              Earned on {achievement.earnedDate}
                            </div>
                          )}
                        </div>
                        {achievement.earned && (
                          <Badge className="flex items-center space-x-1">
                            <Star className="h-3 w-3" />
                            <span>Earned</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Customize your learning experience and notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive emails about your progress and achievements
                    </p>
                  </div>
                  <Switch 
                    checked={editedProfile.preferences?.emailNotifications || false}
                    onCheckedChange={(checked) => 
                      setEditedProfile(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, emailNotifications: checked }
                      }))
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Weekly Digest</h4>
                    <p className="text-sm text-muted-foreground">
                      Get a summary of your weekly learning progress
                    </p>
                  </div>
                  <Switch 
                    checked={editedProfile.preferences?.weeklyDigest || false}
                    onCheckedChange={(checked) => 
                      setEditedProfile(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, weeklyDigest: checked }
                      }))
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Achievement Alerts</h4>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you earn new badges and achievements
                    </p>
                  </div>
                  <Switch 
                    checked={editedProfile.preferences?.achievementAlerts || false}
                    onCheckedChange={(checked) => 
                      setEditedProfile(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, achievementAlerts: checked }
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
