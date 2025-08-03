import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { 
  Home, 
  Map, 
  Trophy, 
  User, 
  LogOut, 
  Settings,
  Flame,
  Star,
  BookOpen,
  Zap
} from "lucide-react"
import { useAuth } from "@/components/auth/DatabaseAuthProvider"

interface HeaderProps {
  activeTab: string
  onTabChange: (tab: string) => void
  userStats: {
    streak: number
    level: number
    experiencePoints: number
  }
}

export function Header({ activeTab, onTabChange, userStats }: HeaderProps) {
  const { user, signOut } = useAuth()

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "roadmaps", label: "Roadmaps", icon: Map },
    { id: "achievements", label: "Achievements", icon: Trophy },
    { id: "profile", label: "Profile", icon: User },
  ]

  const handleSignOut = async () => {
    await signOut()
    window.location.reload()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-primary rounded-lg">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Roadmap</h1>
              <p className="text-xs text-muted-foreground">Learn. Track. Achieve.</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        {user && (
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  onClick={() => onTabChange(item.id)}
                  className="flex items-center space-x-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              )
            })}
          </nav>
        )}

        {/* User Section */}
        <div className="flex items-center space-x-4">
          <ModeToggle />
          
          {!user && (
            <Button onClick={() => window.location.reload()}>Sign In</Button>
          )}

          {user && (
            <>
              {/* User Stats */}
              <div className="hidden lg:flex items-center space-x-3">
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Flame className="h-3 w-3 text-orange-500" />
                  <span>{userStats.streak}</span>
                </Badge>
                
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Star className="h-3 w-3 text-yellow-500" />
                  <span>Lvl {userStats.level}</span>
                </Badge>
                
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Zap className="h-3 w-3 text-blue-500" />
                  <span>{userStats.experiencePoints} XP</span>
                </Badge>
              </div>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.full_name || ""} />
                      <AvatarFallback>
                        {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  
                  {/* Mobile Navigation */}
                  <div className="md:hidden">
                    {navigationItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <DropdownMenuItem
                          key={item.id}
                          onClick={() => onTabChange(item.id)}
                          className="flex items-center space-x-2"
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </DropdownMenuItem>
                      )
                    })}
                    <DropdownMenuSeparator />
                  </div>

                  <DropdownMenuItem onClick={() => onTabChange("profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => onTabChange("settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      {user && (
        <div className="md:hidden border-t bg-background">
          <nav className="flex items-center justify-around p-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onTabChange(item.id)}
                  className="flex flex-col items-center space-y-1 h-auto py-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{item.label}</span>
                </Button>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
