import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Sparkles, Brain, Zap, Search, ArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth/DatabaseAuthProvider"
import { aiService } from "@/services/api"

interface RoadmapGeneratorProps {
  onRoadmapGenerated: (roadmap: any) => void
}

export function RoadmapGenerator({ onRoadmapGenerated }: RoadmapGeneratorProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [topic, setTopic] = useState("")
  const [description, setDescription] = useState("")
  const [difficulty, setDifficulty] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")
  const [recommendedProvider, setRecommendedProvider] = useState<string | null>(null)

  const handleTopicChange = async (value: string) => {
    setTopic(value)
    
    // Get AI provider recommendation
    if (value.length > 3) {
      try {
        const result = await aiService.classifyTopic(value)
        setRecommendedProvider(result.recommendedProvider)
      } catch (error) {
        console.error('Error classifying topic:', error)
      }
    }
  }

  const generateRoadmap = async () => {
    if (!topic.trim()) {
      toast({
        title: "Topic Required",
        description: "Please enter a topic for your learning roadmap.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setProgress(0)
    setCurrentStep("Analyzing topic...")

    try {
      // Step 1: Analyze topic
      setProgress(20)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Step 2: Select AI provider
      setCurrentStep("Selecting best AI provider...")
      setProgress(40)
      await new Promise(resolve => setTimeout(resolve, 800))

      // Step 3: Generate roadmap structure
      setCurrentStep("Generating roadmap structure...")
      setProgress(60)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Step 4: Adding modules and tasks
      setCurrentStep("Adding modules and tasks...")
      setProgress(80)

      console.log('🚀 Generating roadmap for topic:', topic, 'user:', user?.id);
      const roadmap = await aiService.generateRoadmap(topic, user?.id);
      console.log('✅ Roadmap generated via API:', roadmap);

      // Step 5: Finalizing
      setCurrentStep("Finalizing roadmap...")
      setProgress(95)
      await new Promise(resolve => setTimeout(resolve, 500))

      setProgress(100)
      setCurrentStep("Complete!")

      // Add additional metadata if provided
      if (description) {
        roadmap.description = description
      }
      if (difficulty) {
        roadmap.difficulty = difficulty
      }

      onRoadmapGenerated(roadmap)

      toast({
        title: "Roadmap Generated! 🎉",
        description: `Your "${roadmap.title}" roadmap is ready. Generated using ${roadmap.aiProvider?.toUpperCase() || 'AI'}.`,
      })

    } catch (error: any) {
      console.error('Error generating roadmap:', error)

      let errorMessage = "Failed to generate roadmap. Please try again.";

      if (error.response?.status === 404) {
        errorMessage = "AI service temporarily unavailable. Please try again later.";
      } else if (error.response?.status === 429) {
        errorMessage = "Rate limit reached. Please try again in a few minutes or add your API keys in the profile.";
      } else if (error.message?.includes('API key')) {
        errorMessage = "AI service configuration issue. Please check your API keys in the profile section.";
      }

      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
      setProgress(0)
      setCurrentStep("")
    }
  }

  const providerInfo = {
    openai: {
      icon: Brain,
      name: "OpenAI GPT-4",
      description: "Best for technical and programming topics",
      color: "text-green-600"
    },
    gemini: {
      icon: Sparkles,
      name: "Google Gemini",
      description: "Excellent for creative and design topics",
      color: "text-blue-600"
    },
    perplexity: {
      icon: Search,
      name: "Perplexity AI",
      description: "Perfect for current trends and research",
      color: "text-purple-600"
    }
  }

  const exampleTopics = [
    "Full-Stack Web Development",
    "Machine Learning Fundamentals",
    "UI/UX Design Mastery",
    "Digital Marketing Strategy",
    "Data Science with Python",
    "Mobile App Development",
    "Cloud Computing with AWS",
    "Graphic Design Essentials"
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">AI Roadmap Generator</h1>
        <p className="text-muted-foreground">
          Create personalized learning paths powered by advanced AI
        </p>
      </div>

      {/* Generation in Progress */}
      {isGenerating && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium">Generating your roadmap...</span>
              </div>
              
              <Progress value={progress} className="h-2" />
              
              <div className="text-sm text-muted-foreground">
                {currentStep}
              </div>
              
              {recommendedProvider && (
                <div className="flex items-center space-x-2 text-sm">
                  <span>Using:</span>
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    {React.createElement(providerInfo[recommendedProvider as keyof typeof providerInfo]?.icon || Brain, { className: "h-3 w-3" })}
                    <span>{providerInfo[recommendedProvider as keyof typeof providerInfo]?.name}</span>
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generation Form */}
      {!isGenerating && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary" />
              <span>Create Your Learning Roadmap</span>
            </CardTitle>
            <CardDescription>
              Enter your learning topic and let AI create a comprehensive roadmap for you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Topic Input */}
            <div className="space-y-2">
              <Label htmlFor="topic">Learning Topic *</Label>
              <Input
                id="topic"
                placeholder="e.g., Full-Stack Web Development, Machine Learning, UI/UX Design"
                value={topic}
                onChange={(e) => handleTopicChange(e.target.value)}
                className="text-base"
              />
              
              {/* AI Provider Recommendation */}
              {recommendedProvider && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>Recommended AI:</span>
                  <Badge variant="outline" className="flex items-center space-x-1">
                    {React.createElement(providerInfo[recommendedProvider as keyof typeof providerInfo]?.icon || Brain, { 
                      className: `h-3 w-3 ${providerInfo[recommendedProvider as keyof typeof providerInfo]?.color}` 
                    })}
                    <span>{providerInfo[recommendedProvider as keyof typeof providerInfo]?.name}</span>
                  </Badge>
                  <span className="text-xs">- {providerInfo[recommendedProvider as keyof typeof providerInfo]?.description}</span>
                </div>
              )}
            </div>

            {/* Example Topics */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Popular Topics:</Label>
              <div className="flex flex-wrap gap-2">
                {exampleTopics.map((example) => (
                  <Button
                    key={example}
                    variant="outline"
                    size="sm"
                    onClick={() => handleTopicChange(example)}
                    className="text-xs"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Additional Context (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Any specific goals, background, or requirements..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Generate Button */}
            <Button 
              onClick={generateRoadmap} 
              className="w-full" 
              size="lg"
              disabled={!topic.trim()}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate AI Roadmap
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* AI Provider Info */}
      {!isGenerating && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(providerInfo).map(([key, info]) => (
            <Card key={key} className="border-muted">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-muted ${info.color}`}>
                    <info.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{info.name}</div>
                    <div className="text-xs text-muted-foreground">{info.description}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
