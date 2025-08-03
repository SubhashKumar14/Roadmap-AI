import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Flame, TrendingUp } from 'lucide-react'

interface ContributionCalendarProps {
  contributionData?: Array<{
    date: string
    count: number
    level: number
  }>
  currentStreak?: number
  longestStreak?: number
  totalContributions?: number
  year?: number
}

export function ContributionCalendar({ 
  contributionData = [], 
  currentStreak = 0,
  longestStreak = 0,
  totalContributions = 0,
  year = new Date().getFullYear()
}: ContributionCalendarProps) {
  const [selectedCell, setSelectedCell] = useState<{
    date: string
    count: number
    level: number
  } | null>(null)

  // Generate calendar grid for the year
  const calendarGrid = useMemo(() => {
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)
    
    // Find the Sunday before or on start date
    const firstSunday = new Date(startDate)
    firstSunday.setDate(startDate.getDate() - startDate.getDay())
    
    const weeks = []
    const currentDate = new Date(firstSunday)
    
    while (currentDate <= endDate || currentDate.getDay() !== 0) {
      const week = []
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0]
        const contribution = contributionData.find(c => c.date === dateStr)
        
        week.push({
          date: new Date(currentDate),
          dateStr,
          count: contribution?.count || 0,
          level: contribution?.level || 0,
          isCurrentYear: currentDate.getFullYear() === year,
          isToday: dateStr === new Date().toISOString().split('T')[0]
        })
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
      weeks.push(week)
      
      if (currentDate > endDate && currentDate.getDay() === 0) break
    }
    
    return weeks
  }, [contributionData, year])

  // Get contribution level colors (GitHub/LeetCode style)
  const getLevelColor = (level: number, isToday: boolean = false) => {
    if (isToday) {
      return 'ring-2 ring-primary ring-offset-1 bg-primary/20'
    }
    
    switch (level) {
      case 0: return 'bg-muted hover:bg-muted/80'
      case 1: return 'bg-green-200 hover:bg-green-300 dark:bg-green-900 dark:hover:bg-green-800'
      case 2: return 'bg-green-300 hover:bg-green-400 dark:bg-green-800 dark:hover:bg-green-700'
      case 3: return 'bg-green-400 hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600'
      case 4: return 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500'
      default: return 'bg-muted'
    }
  }

  const getContributionText = (count: number) => {
    if (count === 0) return 'No contributions'
    if (count === 1) return '1 contribution'
    return `${count} contributions`
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const monthLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <CalendarDays className="h-5 w-5" />
            <span>Learning Activity</span>
          </CardTitle>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="flex items-center space-x-1">
              <span>{totalContributions} total</span>
            </Badge>
            <Badge variant="outline" className="flex items-center space-x-1">
              <Flame className="h-3 w-3" />
              <span>{currentStreak} current</span>
            </Badge>
            <Badge variant="outline" className="flex items-center space-x-1">
              <TrendingUp className="h-3 w-3" />
              <span>{longestStreak} longest</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px] space-y-2">
            {/* Month labels */}
            <div className="flex justify-between text-xs text-muted-foreground pl-8">
              {monthLabels.map((month, index) => (
                <span key={month} className="flex-1 text-center">
                  {month}
                </span>
              ))}
            </div>
            
            {/* Day labels and calendar grid */}
            <div className="flex space-x-1">
              {/* Day labels */}
              <div className="flex flex-col space-y-1 pr-2">
                {dayLabels.map((day, index) => (
                  <div key={day} className="h-3 flex items-center">
                    {index % 2 === 1 && (
                      <span className="text-xs text-muted-foreground w-6 text-right">
                        {day}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="flex space-x-1">
                {calendarGrid.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col space-y-1">
                    {week.map((day, dayIndex) => (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`
                          w-3 h-3 rounded-sm cursor-pointer transition-all duration-200
                          ${getLevelColor(day.level, day.isToday)}
                          ${!day.isCurrentYear ? 'opacity-50' : ''}
                          border border-transparent hover:border-primary/50
                        `}
                        title={`${formatDate(day.date)}: ${getContributionText(day.count)}`}
                        onClick={() => setSelectedCell({
                          date: day.dateStr,
                          count: day.count,
                          level: day.level
                        })}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedCell ? (
              <span>
                {formatDate(new Date(selectedCell.date))}: {getContributionText(selectedCell.count)}
              </span>
            ) : (
              <span>{totalContributions} contributions in {year}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Less</span>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-sm bg-muted"></div>
              <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900"></div>
              <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-800"></div>
              <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700"></div>
              <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-600"></div>
            </div>
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </div>

        {/* Year navigation could be added here */}
        <div className="flex items-center justify-center pt-2">
          <span className="text-sm font-medium">{year}</span>
        </div>
      </CardContent>
    </Card>
  )
}
