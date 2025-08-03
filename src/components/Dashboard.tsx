import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Target, Trophy, TrendingUp, Flame, Star, BookOpen, CheckCircle } from "lucide-react"

interface DashboardProps {
  userStats: {
    streak: number
    totalCompleted: number
    level: number
    experiencePoints: number
    activeLearningDays: number[]
    weeklyGoal: number
    weeklyProgress: number
  }
  roadmaps: any[]
}

export function Dashboard({ userStats, roadmaps }: DashboardProps) {
  // Ensure roadmaps is always an array
  const safeRoadmaps = Array.isArray(roadmaps) ? roadmaps : [];
  const activeRoadmaps = safeRoadmaps.filter(r => r.progress < 100)
  const completedRoadmaps = safeRoadmaps.filter(r => r.progress === 100)

  const achievements = [
    { id: 1, title: "First Steps", description: "Complete your first task", icon: Star, earned: userStats.totalCompleted >= 1 },
    { id: 2, title: "Week Warrior", description: "7-day learning streak", icon: Flame, earned: userStats.streak >= 7 },
    { id: 3, title: "Module Master", description: "Complete 5 modules", icon: Target, earned: userStats.totalCompleted >= 5 },
    { id: 4, title: "Road Runner", description: "Complete a full roadmap", icon: Trophy, earned: completedRoadmaps.length > 0 },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Flame className="h-5 w-5 text-accent" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">{userStats.streak}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">{userStats.totalCompleted}</p>
                <p className="text-xs text-muted-foreground">Tasks Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">{userStats.level}</p>
                <p className="text-xs text-muted-foreground">Level</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-secondary" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">{activeRoadmaps.length}</p>
                <p className="text-xs text-muted-foreground">Active Roadmaps</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Weekly Goal</span>
          </CardTitle>
          <CardDescription>
            Complete {userStats.weeklyGoal} tasks this week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{userStats.weeklyProgress} / {userStats.weeklyGoal} tasks</span>
              <span>{Math.round((userStats.weeklyProgress / userStats.weeklyGoal) * 100)}%</span>
            </div>
            <Progress value={(userStats.weeklyProgress / userStats.weeklyGoal) * 100} />
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600">{userStats.totalCompleted}</div>
            <div className="text-sm text-muted-foreground">Tasks Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{activeRoadmaps.length}</div>
            <div className="text-sm text-muted-foreground">Active Roadmaps</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-purple-600">{userStats.level}</div>
            <div className="text-sm text-muted-foreground">Current Level</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-orange-600">{userStats.streak}</div>
            <div className="text-sm text-muted-foreground">Day Streak</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Achievements</span>
          </CardTitle>
          <CardDescription>
            Your learning milestones and badges
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
                    <div className={`p-2 rounded-lg ${
                      achievement.earned 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{achievement.title}</div>
                      <div className="text-sm text-muted-foreground">{achievement.description}</div>
                    </div>
                    {achievement.earned && (
                      <Badge className="ml-auto">Earned</Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Roadmaps */}
      {activeRoadmaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Continue Learning</CardTitle>
            <CardDescription>
              Pick up where you left off
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeRoadmaps.slice(0, 3).map((roadmap) => (
                <div key={roadmap.id} className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{roadmap.title}</h3>
                    <Badge variant="secondary">{Math.round(roadmap.progress)}%</Badge>
                  </div>
                  <Progress value={roadmap.progress} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
