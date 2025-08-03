import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Play, 
  BookOpen, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Target,
  Zap,
  Award,
  Youtube
} from 'lucide-react'

interface DSARoadmapViewProps {
  roadmap: any
  onTaskComplete: (moduleId: string, taskId: string) => void
  onModuleComplete: (moduleId: string) => void
}

export function DSARoadmapView({ roadmap, onTaskComplete, onModuleComplete }: DSARoadmapViewProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['1']))
  const [selectedTask, setSelectedTask] = useState<any>(null)

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
    } else {
      newExpanded.add(moduleId)
    }
    setExpandedModules(newExpanded)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
      case 'hard': return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'theory': return <BookOpen className="h-4 w-4" />
      case 'practice': return <Zap className="h-4 w-4" />
      case 'project': return <Target className="h-4 w-4" />
      case 'creative': return <Award className="h-4 w-4" />
      default: return <Circle className="h-4 w-4" />
    }
  }

  const totalTasks = roadmap.modules.reduce((sum: number, module: any) => 
    sum + module.tasks.length, 0
  )
  
  const completedTasks = roadmap.modules.reduce((sum: number, module: any) => 
    sum + module.tasks.filter((task: any) => task.completed).length, 0
  )

  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{roadmap.title}</h1>
            <p className="text-muted-foreground max-w-2xl">{roadmap.description}</p>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className={getDifficultyColor(roadmap.difficulty)}>
                {roadmap.difficulty}
              </Badge>
              <Badge variant="secondary">
                {roadmap.aiProvider?.toUpperCase()}
              </Badge>
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {roadmap.estimatedDuration}
              </Badge>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{completedTasks}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{totalTasks}</div>
                <div className="text-sm text-muted-foreground">Total Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{Math.round(completionRate)}%</div>
                <div className="text-sm text-muted-foreground">Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{roadmap.modules.length}</div>
                <div className="text-sm text-muted-foreground">Modules</div>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Learning Modules</h2>
          
          {roadmap.modules.map((module: any, moduleIndex: number) => {
            const moduleProgress = module.tasks.length > 0 
              ? (module.tasks.filter((t: any) => t.completed).length / module.tasks.length) * 100 
              : 0
            const isExpanded = expandedModules.has(module.id)

            return (
              <Card key={module.id} className="overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleModule(module.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center">
                            {isExpanded ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                          </div>
                          <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                            {moduleIndex + 1}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{module.title}</CardTitle>
                            <CardDescription>{module.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={getDifficultyColor(module.difficulty)}>
                            {module.difficulty}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            {Math.round(moduleProgress)}%
                          </div>
                        </div>
                      </div>
                      <Progress value={moduleProgress} className="h-1 mt-2" />
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {module.tasks.map((task: any, taskIndex: number) => (
                          <div
                            key={task.id}
                            className={`
                              p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm
                              ${task.completed ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-border'}
                              ${selectedTask?.id === task.id ? 'ring-2 ring-primary' : ''}
                            `}
                            onClick={() => setSelectedTask(task)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onTaskComplete(module.id, task.id)
                                  }}
                                >
                                  {task.completed ? 
                                    <CheckCircle2 className="h-4 w-4 text-green-600" /> : 
                                    <Circle className="h-4 w-4 text-muted-foreground" />
                                  }
                                </Button>
                                <div className="flex items-center space-x-2">
                                  {getTypeIcon(task.type)}
                                  <span className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                    {task.title}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge size="sm" className={getDifficultyColor(task.difficulty)}>
                                  {task.difficulty}
                                </Badge>
                                {task.estimatedTime && (
                                  <Badge variant="outline" size="sm">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {task.estimatedTime}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}
        </div>

        {/* Task Details Sidebar */}
        <div className="space-y-4">
          {selectedTask ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {getTypeIcon(selectedTask.type)}
                  <span>{selectedTask.title}</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge className={getDifficultyColor(selectedTask.difficulty)}>
                    {selectedTask.difficulty}
                  </Badge>
                  <Badge variant="outline">
                    {selectedTask.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTask.description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                  </div>
                )}

                {selectedTask.learningObjectives && (
                  <div>
                    <h4 className="font-medium mb-2">Learning Objectives</h4>
                    <ul className="space-y-1">
                      {selectedTask.learningObjectives.map((objective: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start">
                          <span className="mr-2">•</span>
                          {objective}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedTask.prerequisites && selectedTask.prerequisites.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Prerequisites</h4>
                    <ul className="space-y-1">
                      {selectedTask.prerequisites.map((prereq: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start">
                          <span className="mr-2">•</span>
                          {prereq}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedTask.resources && (
                  <div>
                    <h4 className="font-medium mb-2">Resources</h4>
                    <Tabs defaultValue="videos" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="videos">Videos</TabsTrigger>
                        <TabsTrigger value="articles">Articles</TabsTrigger>
                        <TabsTrigger value="practice">Practice</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="videos" className="space-y-2">
                        {selectedTask.resources.videos?.map((video: any, index: number) => (
                          <div key={index} className="flex items-center space-x-2 p-2 border rounded-lg">
                            <Youtube className="h-4 w-4 text-red-600" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{video.title}</div>
                              <div className="text-xs text-muted-foreground">{video.channel}</div>
                            </div>
                            <Button size="sm" variant="outline" asChild>
                              <a href={video.url} target="_blank" rel="noopener noreferrer">
                                <Play className="h-3 w-3" />
                              </a>
                            </Button>
                          </div>
                        )) || <p className="text-sm text-muted-foreground">No videos available</p>}
                      </TabsContent>
                      
                      <TabsContent value="articles" className="space-y-2">
                        {selectedTask.resources.articles?.map((article: string, index: number) => (
                          <div key={index} className="flex items-center space-x-2 p-2 border rounded-lg">
                            <BookOpen className="h-4 w-4 text-blue-600" />
                            <span className="text-sm flex-1">{article}</span>
                            <Button size="sm" variant="outline">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        )) || <p className="text-sm text-muted-foreground">No articles available</p>}
                      </TabsContent>
                      
                      <TabsContent value="practice" className="space-y-2">
                        {selectedTask.resources.practice?.map((practice: string, index: number) => (
                          <div key={index} className="flex items-center space-x-2 p-2 border rounded-lg">
                            <Zap className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm flex-1">{practice}</span>
                            <Button size="sm" variant="outline">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        )) || <p className="text-sm text-muted-foreground">No practice resources available</p>}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                <Button 
                  className="w-full" 
                  onClick={() => onTaskComplete(
                    roadmap.modules.find((m: any) => m.tasks.find((t: any) => t.id === selectedTask.id))?.id || '',
                    selectedTask.id
                  )}
                  variant={selectedTask.completed ? "outline" : "default"}
                >
                  {selectedTask.completed ? "Mark as Incomplete" : "Mark as Complete"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">Select a Task</h3>
                <p className="text-sm text-muted-foreground">
                  Click on any task to view details, resources, and track your progress.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
