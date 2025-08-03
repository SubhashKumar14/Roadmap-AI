import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  CheckCircle, 
  Database, 
  ExternalLink, 
  Copy, 
  RefreshCw,
  Info
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { checkDatabaseSetup, getSetupMessage, type DatabaseStatus } from '@/services/databaseSetup'

export function DatabaseSetupCard() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const { toast } = useToast()

  const checkSetup = async () => {
    setIsChecking(true)
    try {
      const dbStatus = await checkDatabaseSetup()
      setStatus(dbStatus)
      setShowInstructions(dbStatus.setupRequired)
    } catch (error) {
      toast({
        title: "Setup Check Failed",
        description: "Could not check database setup status",
        variant: "destructive"
      })
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkSetup()
  }, [])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: "SQL schema copied to clipboard"
      })
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      })
    }
  }

  const sqlSchema = `-- AI Roadmap Database Schema
-- Run this in your Supabase SQL Editor

-- Create tables for real-time AI Roadmap functionality

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  bio TEXT,
  location TEXT,
  github_username TEXT,
  twitter_username TEXT,
  learning_goals JSONB DEFAULT '[]'::jsonb,
  preferences JSONB DEFAULT '{
    "emailNotifications": true,
    "weeklyDigest": true,
    "achievementAlerts": true
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- User stats table
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  streak INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  weekly_goal INTEGER DEFAULT 5,
  weekly_progress INTEGER DEFAULT 0,
  roadmaps_completed INTEGER DEFAULT 0,
  total_study_time INTEGER DEFAULT 0,
  global_ranking INTEGER,
  attended_contests INTEGER DEFAULT 0,
  problems_solved JSONB DEFAULT '{
    "easy": 0,
    "medium": 0,
    "hard": 0,
    "total": 0
  }'::jsonb,
  active_learning_days JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Roadmaps table
CREATE TABLE IF NOT EXISTS roadmaps (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT,
  estimated_duration TEXT,
  ai_provider TEXT,
  category TEXT,
  modules JSONB NOT NULL,
  progress REAL DEFAULT 0,
  is_public BOOLEAN DEFAULT FALSE,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  roadmap_id TEXT REFERENCES roadmaps(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  time_spent INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, roadmap_id, module_id, task_id)
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  icon TEXT,
  earned BOOLEAN DEFAULT FALSE,
  earned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own stats" ON user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON user_stats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stats" ON user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own roadmaps" ON roadmaps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public roadmaps" ON roadmaps FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Users can update own roadmaps" ON roadmaps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own roadmaps" ON roadmaps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own roadmaps" ON roadmaps FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own progress" ON user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON user_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own achievements" ON achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own achievements" ON achievements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE user_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE roadmaps;
ALTER PUBLICATION supabase_realtime ADD TABLE user_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE achievements;`

  if (!status) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Checking database setup...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Database Setup Status</span>
          </CardTitle>
          <CardDescription>
            Real-time features require Supabase database setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {status.isConfigured ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">Supabase Configuration</span>
                <Badge variant={status.isConfigured ? "default" : "destructive"}>
                  {status.isConfigured ? "Configured" : "Missing"}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2">
                {status.tablesExist ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
                <span className="font-medium">Database Tables</span>
                <Badge variant={status.tablesExist ? "default" : "secondary"}>
                  {status.tablesExist ? "Ready" : "Setup Required"}
                </Badge>
              </div>
            </div>
            
            <Button 
              onClick={checkSetup} 
              disabled={isChecking}
              variant="outline"
            >
              {isChecking ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Recheck
            </Button>
          </div>

          {status.error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {getSetupMessage(status)}
              </AlertDescription>
            </Alert>
          )}

          {status.missingTables.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Missing tables: {status.missingTables.join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {showInstructions && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>
              Follow these steps to set up your database for real-time features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Open Supabase SQL Editor</h4>
                  <p className="text-sm text-muted-foreground">
                    Go to your Supabase project → SQL Editor
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => window.open('https://app.supabase.com', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Supabase
                  </Button>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Run the SQL Schema</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Copy and paste this schema into the SQL Editor and run it
                  </p>
                  <div className="bg-muted p-4 rounded-lg relative">
                    <pre className="text-sm overflow-x-auto max-h-60 overflow-y-auto">
                      {sqlSchema}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(sqlSchema)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Refresh the Page</h4>
                  <p className="text-sm text-muted-foreground">
                    After running the schema, refresh this page to activate real-time features
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Page
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
