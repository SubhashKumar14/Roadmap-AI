import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from './SupabaseAuthProvider'
import { useToast } from '@/hooks/use-toast'
import { Eye, EyeOff, Chrome, Github, Zap } from 'lucide-react'

export function AuthCard() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  
  const { signIn, signUp, signInWithProvider } = useAuth()
  const { toast } = useToast()

  const handleEmailAuth = async (isSignUp: boolean) => {
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    
    try {
      let result
      if (isSignUp) {
        result = await signUp(email, password, { 
          full_name: name,
          email: email 
        })
      } else {
        result = await signIn(email, password)
      }

      if (result.error) {
        toast({
          title: "Authentication failed",
          description: result.error.message,
          variant: "destructive"
        })
      } else {
        toast({
          title: isSignUp ? "Account created!" : "Welcome back!",
          description: isSignUp ? "Please check your email to verify your account." : "You've been signed in successfully."
        })
      }
    } catch (error: any) {
      toast({
        title: "An error occurred",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleProviderAuth = async (provider: 'google' | 'github' | 'discord') => {
    setIsLoading(true)
    
    try {
      const { error } = await signInWithProvider(provider)
      if (error) {
        toast({
          title: "Authentication failed",
          description: error.message,
          variant: "destructive"
        })
      }
    } catch (error: any) {
      toast({
        title: "An error occurred",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="p-3 bg-primary rounded-xl">
              <Zap className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">AI Roadmap</h1>
          </div>
          <p className="text-muted-foreground">
            Create personalized learning paths with AI
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => handleEmailAuth(false)}
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => handleEmailAuth(true)}
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </TabsContent>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleProviderAuth('google')}
                  disabled={isLoading}
                >
                  <Chrome className="h-4 w-4 mr-2" />
                  Google
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleProviderAuth('github')}
                  disabled={isLoading}
                >
                  <Github className="h-4 w-4 mr-2" />
                  GitHub
                </Button>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>

        {/* Temporary debug component */}
        <SupabaseTest />
      </div>
    </div>
  )
}

export function SignOutButton() {
  const { signOut } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      const { error } = await signOut()
      if (error) {
        toast({
          title: "Error signing out",
          description: error.message,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Signed out successfully",
          description: "You have been signed out of your account."
        })
      }
    } catch (error: any) {
      toast({
        title: "An error occurred",
        description: error.message || "Failed to sign out.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      variant="ghost" 
      onClick={handleSignOut}
      disabled={isLoading}
    >
      {isLoading ? "Signing out..." : "Sign Out"}
    </Button>
  )
}
