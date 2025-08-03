import { supabase } from '@/lib/supabase'

export interface DatabaseStatus {
  isConfigured: boolean
  tablesExist: boolean
  missingTables: string[]
  setupRequired: boolean
  error?: string
}

// Required tables for the application
const REQUIRED_TABLES = [
  'user_profiles',
  'user_stats', 
  'roadmaps',
  'user_progress',
  'achievements'
]

// Check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return !!(url && key && url !== 'https://placeholder.supabase.co' && key !== 'placeholder-key')
}

// Check if database tables exist
export const checkDatabaseSetup = async (): Promise<DatabaseStatus> => {
  const status: DatabaseStatus = {
    isConfigured: isSupabaseConfigured(),
    tablesExist: false,
    missingTables: [],
    setupRequired: false
  }

  if (!status.isConfigured) {
    status.error = 'Supabase not configured'
    status.setupRequired = true
    return status
  }

  try {
    // Check each required table
    const missingTables: string[] = []
    
    for (const table of REQUIRED_TABLES) {
      try {
        // Try to query the table with limit 0 to check existence
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(0)
        
        if (error) {
          console.warn(`Table ${table} check failed:`, error.message)
          missingTables.push(table)
        }
      } catch (err) {
        console.warn(`Error checking table ${table}:`, err)
        missingTables.push(table)
      }
    }

    status.missingTables = missingTables
    status.tablesExist = missingTables.length === 0
    status.setupRequired = missingTables.length > 0

    if (status.setupRequired) {
      status.error = `Missing database tables: ${missingTables.join(', ')}`
    }

  } catch (error: any) {
    status.error = `Database connection failed: ${error.message || 'Unknown error'}`
    status.setupRequired = true
  }

  return status
}

// Create basic user profile and stats if tables exist
export const initializeUserInDatabase = async (userId: string, userData: any): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false
  }

  try {
    // Check if tables exist first
    const dbStatus = await checkDatabaseSetup()
    if (!dbStatus.tablesExist) {
      console.warn('Database tables not set up, skipping user initialization')
      return false
    }

    // Initialize user stats if not exists
    const { data: existingStats } = await supabase
      .from('user_stats')
      .select('user_id')
      .eq('user_id', userId)
      .single()

    if (!existingStats) {
      await supabase
        .from('user_stats')
        .insert({
          user_id: userId,
          streak: 0,
          total_completed: 0,
          level: 1,
          experience_points: 0,
          weekly_goal: 5,
          weekly_progress: 0,
          roadmaps_completed: 0,
          total_study_time: 0,
          attended_contests: 0,
          problems_solved: {
            easy: 0,
            medium: 0,
            hard: 0,
            total: 0
          },
          active_learning_days: []
        })
    }

    // Initialize user profile if not exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single()

    if (!existingProfile) {
      await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          name: userData.name || '',
          email: userData.email || '',
          bio: '',
          location: '',
          github_username: '',
          twitter_username: '',
          learning_goals: [],
          preferences: {
            emailNotifications: true,
            weeklyDigest: true,
            achievementAlerts: true
          }
        })
    }

    return true
  } catch (error: any) {
    console.error('Failed to initialize user in database:', error.message || error)
    return false
  }
}

// Get a user-friendly setup message
export const getSetupMessage = (status: DatabaseStatus): string => {
  if (!status.isConfigured) {
    return 'Supabase configuration is missing. Please set up your environment variables.'
  }
  
  if (status.setupRequired) {
    return `Database setup required. Missing tables: ${status.missingTables.join(', ')}`
  }
  
  return 'Database is properly configured!'
}

// Check if a specific error is a table missing error
export const isTableMissingError = (error: any): boolean => {
  if (!error) return false
  const message = error.message || error.toString()
  return message.includes('relation') && message.includes('does not exist')
}

// Check if error is a database connection error
export const isDatabaseConnectionError = (error: any): boolean => {
  if (!error) return false
  const message = error.message || error.toString()
  return (
    message.includes('Network Error') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('ECONNREFUSED')
  )
}
