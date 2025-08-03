import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

export function SupabaseTest() {
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('testpassword123')
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null)
  const { toast } = useToast()

  const testConnection = async () => {
    setIsLoading(true)
    try {
      // Test basic Supabase connection
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        setConnectionStatus(`❌ Connection error: ${error.message}`)
        toast({
          title: "Connection Test Failed",
          description: error.message,
          variant: "destructive"
        })
      } else {
        setConnectionStatus("✅ Supabase connection successful")
        toast({
          title: "Connection Test Passed",
          description: "Supabase is properly configured and accessible"
        })
      }
    } catch (error: any) {
      setConnectionStatus(`❌ Network error: ${error.message}`)
      toast({
        title: "Network Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createTestAccount = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: 'Test User'
          }
        }
      })

      if (error) {
        toast({
          title: "Test Account Creation Failed",
          description: error.message,
          variant: "destructive"
        })
      } else if (data.user) {
        toast({
          title: "Test Account Created!",
          description: `Account created for ${email}. Check email for verification if required.`
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testLogin = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        toast({
          title: "Test Login Failed",
          description: error.message,
          variant: "destructive"
        })
      } else if (data.user) {
        toast({
          title: "Test Login Successful!",
          description: `Successfully logged in as ${data.user.email}`
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>🔧 Supabase Debug Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Button 
            onClick={testConnection} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Testing..." : "Test Supabase Connection"}
          </Button>
          {connectionStatus && (
            <p className="text-sm mt-2 p-2 bg-muted rounded">
              {connectionStatus}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Test Account Creation & Login</h3>
          <Input
            type="email"
            placeholder="Test email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Test password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={createTestAccount} 
              disabled={isLoading}
              variant="outline"
            >
              Create Test Account
            </Button>
            <Button 
              onClick={testLogin} 
              disabled={isLoading}
              variant="outline"
            >
              Test Login
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <p><strong>Environment:</strong></p>
          <p>URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
          <p>Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
        </div>
      </CardContent>
    </Card>
  )
}
