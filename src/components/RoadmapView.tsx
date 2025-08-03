import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckCircle, Circle, BookOpen, ExternalLink, Clock, Target, Trophy, ChevronDown, ChevronRight } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DSARoadmapView } from "./DSARoadmapView"

interface Task {
  id: string
  title: string
  completed: boolean
  resources: string[]
}

interface Module {
  id: string
  title: string
  description: string
  tasks: Task[]
  completed: boolean
}

interface Roadmap {
  id: string
  title: string
  description: string
  difficulty: string
  aiProvider: string
  estimatedDuration: string
  modules: Module[]
  createdAt: string
  progress: number
}

interface RoadmapViewProps {
  roadmap: Roadmap
  onTaskComplete: (moduleId: string, taskId: string) => void
  onModuleComplete: (moduleId: string) => void
}

export function RoadmapView({ roadmap, onTaskComplete, onModuleComplete }: RoadmapViewProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set([roadmap.modules[0]?.id]))

  // Check if this is an enhanced roadmap (has new format with detailed task structure)
  const isEnhancedRoadmap = roadmap.modules.some((module: any) =>
    module.tasks.some((task: any) =>
      task.difficulty || task.type || task.resources?.videos || task.learningObjectives
    )
  )

  // Use enhanced DSA view for new format roadmaps
  if (isEnhancedRoadmap) {
    return <DSARoadmapView roadmap={roadmap} onTaskComplete={onTaskComplete} onModuleComplete={onModuleComplete} />
  }

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
    } else {
      newExpanded.add(moduleId)
    }
    setExpandedModules(newExpanded)
  }

  const getAIProviderInfo = (provider: string) => {
    const providers = {
      openai: { name: 'OpenAI GPT-4', color: 'bg-primary text-primary-foreground' },
      gemini: { name: 'Google Gemini', color: 'bg-secondary text-secondary-foreground' },
      perplexity: { name: 'Perplexity AI', color: 'bg-accent text-accent-foreground' }
    }
    return providers[provider as keyof typeof providers] || providers.openai
  }

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      beginner: 'bg-success text-success-foreground',
      intermediate: 'bg-warning text-warning-foreground',
      advanced: 'bg-destructive text-destructive-foreground'
    }
    return colors[difficulty as keyof typeof colors] || colors.intermediate
  }

  const completedTasks = roadmap.modules.reduce((total, module) => 
    total + module.tasks.filter(task => task.completed).length, 0
  )
  const totalTasks = roadmap.modules.reduce((total, module) => total + module.tasks.length, 0)
  const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const aiProvider = getAIProviderInfo(roadmap.aiProvider)

  return (
    <div className="space-y-6">
      {/* Roadmap Header */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{roadmap.title}</CardTitle>
              <CardDescription className="text-base">{roadmap.description}</CardDescription>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Badge className={aiProvider.color}>{aiProvider.name}</Badge>
              <Badge className={getDifficultyColor(roadmap.difficulty)}>
                {roadmap.difficulty.charAt(0).toUpperCase() + roadmap.difficulty.slice(1)}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{roadmap.estimatedDuration}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{completedTasks} / {totalTasks} tasks completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{Math.round(overallProgress)}% complete</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Modules */}
      <div className="space-y-4">
        {roadmap.modules.map((module, index) => {
          const moduleProgress = module.tasks.length > 0 
            ? (module.tasks.filter(task => task.completed).length / module.tasks.length) * 100 
            : 0
          const isExpanded = expandedModules.has(module.id)
          const isCompleted = module.completed || moduleProgress === 100

          return (
            <Card key={module.id} className={`transition-all ${isCompleted ? 'border-success bg-success/5' : ''}`}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleModule(module.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <span className="text-sm font-medium">{index + 1}</span>
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{module.title}</CardTitle>
                          <CardDescription>{module.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{Math.round(moduleProgress)}%</div>
                          <div className="text-xs text-muted-foreground">
                            {module.tasks.filter(task => task.completed).length} / {module.tasks.length} tasks
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                    <Progress value={moduleProgress} className="h-1 mt-2" />
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {module.tasks.map((task) => (
                        <div key={task.id} className={`p-3 rounded-lg border transition-all ${
                          task.completed ? 'border-success bg-success/5' : 'border-border hover:border-primary/50'
                        }`}>
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              checked={task.completed}
                              onCheckedChange={() => onTaskComplete(module.id, task.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className={`font-medium ${task.completed ? 'text-success line-through' : ''}`}>
                                {task.title}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {task.resources.map((resource, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    <BookOpen className="h-3 w-3 mr-1" />
                                    {resource}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!isCompleted && moduleProgress === 100 && (
                      <Button
                        onClick={() => onModuleComplete(module.id)}
                        className="w-full mt-4"
                        variant="default"
                      >
                        <Trophy className="mr-2 h-4 w-4" />
                        Complete Module
                      </Button>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
