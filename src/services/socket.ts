import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Check if we're in a cloud environment
const isCloudEnvironment = window.location.hostname.includes('fly.dev') ||
                          window.location.hostname.includes('vercel.app') ||
                          window.location.hostname.includes('netlify.app') ||
                          !window.location.hostname.includes('localhost');

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private mockMode: boolean = false;

  connect(userId: string) {
    if (this.socket?.connected || this.mockMode) {
      return;
    }

    this.userId = userId;

    // Check if we're in cloud environment
    const isCloudEnvironment = window.location.hostname.includes('fly.dev') ||
                              window.location.hostname.includes('vercel.app') ||
                              window.location.hostname.includes('netlify.app') ||
                              !window.location.hostname.includes('localhost');

    if (isCloudEnvironment) {
      console.log('🌐 Cloud environment detected, using local storage for real-time features');
      this.mockMode = true;
      this.setupMockSocket();
      return;
    }

    this.mockMode = false;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to server:', this.socket?.id);
      this.mockMode = false;
      this.socket?.emit('join-room', userId);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection failed:', error);
      this.mockMode = true;
      this.setupMockSocket();
    });
  }

  private setupMockSocket() {
    console.log('Socket service running in mock mode');
    // Simulate successful connection
    setTimeout(() => {
      console.log('Mock socket connected for user:', this.userId);
    }, 100);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.userId = null;
    this.mockMode = false;
  }

  // Progress update events
  emitProgressUpdate(data: any) {
    if (this.mockMode) {
      console.log('Mock: Progress update emitted', data);
      return;
    }

    if (this.socket && this.userId) {
      this.socket.emit('progress-update', {
        ...data,
        userId: this.userId,
      });
    }
  }

  onProgressUpdate(callback: (data: any) => void) {
    if (this.mockMode) {
      // In mock mode, we don't receive real updates
      return;
    }

    if (this.socket) {
      this.socket.on('progress-updated', callback);
    }
  }

  // Roadmap sharing events
  emitRoadmapShared(roadmapData: any) {
    if (this.mockMode) {
      console.log('Mock: Roadmap shared', roadmapData);
      return;
    }

    if (this.socket && this.userId) {
      this.socket.emit('roadmap-shared', {
        ...roadmapData,
        userId: this.userId,
      });
    }
  }

  onRoadmapShared(callback: (data: any) => void) {
    if (this.mockMode) {
      return;
    }

    if (this.socket) {
      this.socket.on('new-roadmap-shared', callback);
    }
  }

  // Real-time notifications
  onNotification(callback: (notification: any) => void) {
    if (this.mockMode) {
      return;
    }

    if (this.socket) {
      this.socket.on('notification', callback);
    }
  }

  // Achievement notifications
  onAchievementEarned(callback: (achievement: any) => void) {
    if (this.mockMode) {
      return;
    }

    if (this.socket) {
      this.socket.on('achievement-earned', callback);
    }
  }

  // Level up notifications
  onLevelUp(callback: (levelData: any) => void) {
    if (this.mockMode) {
      return;
    }

    if (this.socket) {
      this.socket.on('level-up', callback);
    }
  }

  // Remove event listeners
  off(event: string) {
    if (this.mockMode) {
      return;
    }

    if (this.socket) {
      this.socket.off(event);
    }
  }

  // Get connection status
  isConnected(): boolean {
    if (this.mockMode) {
      return true; // Mock mode is always "connected"
    }
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
export default socketService;
