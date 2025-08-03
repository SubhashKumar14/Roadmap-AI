import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, Cloud, CloudOff } from 'lucide-react'

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    const handleWebSocketFailed = () => {
      setRealtimeStatus('disconnected')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('websocket-connection-failed', handleWebSocketFailed)

    // Set timeout to check real-time status
    const timeout = setTimeout(() => {
      if (realtimeStatus === 'connecting') {
        setRealtimeStatus('disconnected')
      }
    }, 10000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('websocket-connection-failed', handleWebSocketFailed)
      clearTimeout(timeout)
    }
  }, [realtimeStatus])

  if (!isOnline) {
    return (
      <Badge variant="destructive" className="text-xs">
        <WifiOff className="w-3 h-3 mr-1" />
        Offline
      </Badge>
    )
  }

  if (realtimeStatus === 'disconnected') {
    return (
      <Badge variant="secondary" className="text-xs">
        <CloudOff className="w-3 h-3 mr-1" />
        Local Mode
      </Badge>
    )
  }

  return (
    <Badge variant="default" className="text-xs">
      <Cloud className="w-3 h-3 mr-1" />
      Online
    </Badge>
  )
}
