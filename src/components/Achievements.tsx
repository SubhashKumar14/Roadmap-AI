import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Star, Target, Flame, BookOpen, Code, Palette, Globe, Calendar, Clock, CheckCircle, Award } from "lucide-react"

interface AchievementsProps {
  userStats: {
    streak: number
    totalCompleted: number
    level: number
    experiencePoints: number
    roadmapsCompleted: number
    totalStudyTime: number
  }
}

export function Achievements({ userStats }: AchievementsProps) {
  const achievements = [
    {
      id: 1,
      title: "First Steps",
      description: "Complete your first learning task",
      icon: Star,
      category: "Getting Started",
      requirement: 1,
      current: Math.min(userStats.totalCompleted || 0, 1),
      type: "tasks",
      difficulty: "easy",
      points: 10,
      earned: (userStats.totalCompleted || 0) >= 1
    },
    {
      id: 2,
      title: "Task Master",
      description: "Complete 10 learning tasks",
      icon: CheckCircle,
      category: "Progress",
      requirement: 10,
      current: Math.min(userStats.totalCompleted || 0, 10),
      type: "tasks",
      difficulty: "medium",
      points: 50,
      earned: (userStats.totalCompleted || 0) >= 10
    },
    {
      id: 3,
      title: "Century Club",
      description: "Complete 100 learning tasks",
      icon: Target,
      category: "Progress", 
      requirement: 100,
      current: Math.min(userStats.totalCompleted || 0, 100),
      type: "tasks",
      difficulty: "hard",
      points: 500,
      earned: (userStats.totalCompleted || 0) >= 100
    },
    {
      id: 4,
      title: "Week Warrior",
      description: "Maintain a 7-day learning streak",
      icon: Flame,
      category: "Consistency",
      requirement: 7,
      current: Math.min(userStats.streak || 0, 7),
      type: "streak",
      difficulty: "medium",
      points: 75,
      earned: (userStats.streak || 0) >= 7
    },
    {
      id: 5,
      title: "Monthly Master",
      description: "Maintain a 30-day learning streak",
      icon: Calendar,
      category: "Consistency",
      requirement: 30,
      current: Math.min(userStats.streak || 0, 30),
      type: "streak",
      difficulty: "hard",
      points: 300,
      earned: (userStats.streak || 0) >= 30
    },
    {
      id: 6,
      title: "Learning Legend",
      description: "Maintain a 100-day learning streak",
      icon: Award,
      category: "Consistency",
      requirement: 100,
      current: Math.min(userStats.streak || 0, 100),
      type: "streak",
      difficulty: "legendary",
      points: 1000,
      earned: (userStats.streak || 0) >= 100
    },
    {
      id: 7,
      title: "Road Runner",
      description: "Complete your first roadmap",
      icon: BookOpen,
      category: "Milestones",
      requirement: 1,
      current: Math.min(userStats.roadmapsCompleted || 0, 1),
      type: "roadmaps",
      difficulty: "medium",
      points: 100,
      earned: (userStats.roadmapsCompleted || 0) >= 1
    },
    {
      id: 8,
      title: "Path Pioneer",
      description: "Complete 5 different roadmaps",
      icon: Trophy,
      category: "Milestones",
      requirement: 5,
      current: Math.min(userStats.roadmapsCompleted, 5),
      type: "roadmaps",
      difficulty: "hard",
      points: 500,
      earned: userStats.roadmapsCompleted >= 5
    },
    {
      id: 9,
      title: "Code Crusader",
      description: "Complete a programming roadmap",
      icon: Code,
      category: "Specialization",
      requirement: 1,
      current: 0, // This would need to track specific roadmap types
      type: "special",
      difficulty: "medium",
      points: 150,
      earned: false
    },
    {
      id: 10,
      title: "Design Dynamo",
      description: "Complete a design roadmap",
      icon: Palette,
      category: "Specialization",
      requirement: 1,
      current: 0,
      type: "special",
      difficulty: "medium",
      points: 150,
      earned: false
    },
    {
      id: 11,
      title: "Research Rockstar",
      description: "Complete a research-based roadmap",
      icon: Globe,
      category: "Specialization",
      requirement: 1,
      current: 0,
      type: "special",
      difficulty: "medium",
      points: 150,
      earned: false
    },
    {
      id: 12,
      title: "Time Traveler",
      description: "Spend 100 hours learning",
      icon: Clock,
      category: "Dedication",
      requirement: 100,
      current: Math.min(userStats.totalStudyTime, 100),
      type: "time",
      difficulty: "hard",
      points: 400,
      earned: userStats.totalStudyTime >= 100
    }
  ]

  const categories = ["Getting Started", "Progress", "Consistency", "Milestones", "Specialization", "Dedication"]
  
  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: "bg-success text-success-foreground",
      medium: "bg-warning text-warning-foreground", 
      hard: "bg-destructive text-destructive-foreground",
      legendary: "bg-gradient-primary text-white"
    }
    return colors[difficulty as keyof typeof colors] || colors.medium
  }

  const getDifficultyPoints = (difficulty: string) => {
    const points = {
      easy: "10-25 pts",
      medium: "50-150 pts",
      hard: "300-500 pts", 
      legendary: "1000+ pts"
    }
    return points[difficulty as keyof typeof points] || points.medium
  }

  const earnedAchievements = achievements.filter(a => a.earned)
  const totalPoints = earnedAchievements.reduce((sum, a) => sum + a.points, 0)
  const completionPercentage = (earnedAchievements.length / achievements.length) * 100

  return (
    <div className="space-y-6">
      {/* Achievement Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-primary" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">{earnedAchievements.length}</p>
                <p className="text-xs text-muted-foreground">Achievements Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-accent" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">{totalPoints}</p>
                <p className="text-xs text-muted-foreground">Total Points</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-secondary" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">{Math.round(completionPercentage)}%</p>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievement Categories */}
      {categories.map(category => {
        const categoryAchievements = achievements.filter(a => a.category === category)
        const earnedInCategory = categoryAchievements.filter(a => a.earned).length

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{category}</span>
                <Badge variant="secondary">
                  {earnedInCategory} / {categoryAchievements.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                {category === "Getting Started" && "Your first steps in the learning journey"}
                {category === "Progress" && "Task completion milestones"}
                {category === "Consistency" && "Daily learning streak achievements"}
                {category === "Milestones" && "Major roadmap completion goals"}
                {category === "Specialization" && "Domain-specific learning achievements"}
                {category === "Dedication" && "Time and effort recognition"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryAchievements.map(achievement => {
                  const Icon = achievement.icon
                  const progress = achievement.requirement > 0 ? (achievement.current / achievement.requirement) * 100 : 0

                  return (
                    <div
                      key={achievement.id}
                      className={`p-4 rounded-lg border transition-all ${
                        achievement.earned 
                          ? 'border-primary bg-primary/5 shadow-glow' 
                          : 'border-border opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 rounded-lg ${
                          achievement.earned 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          {achievement.earned && <Badge>Earned</Badge>}
                          <Badge className={getDifficultyColor(achievement.difficulty)}>
                            {achievement.difficulty}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-medium">{achievement.title}</h3>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        
                        {!achievement.earned && achievement.type !== "special" && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{achievement.current} / {achievement.requirement}</span>
                              <span>{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-1" />
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{achievement.points} points</span>
                          <span>{getDifficultyPoints(achievement.difficulty)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
