// Global error handler for development environment issues
export function setupGlobalErrorHandling() {
  // Aggressively disable Vite client functionality in cloud environments
  if (isCloudEnvironment()) {
    // Override fetch for Vite client calls
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      if (typeof url === 'string' && (url.includes('/@vite/') || url.includes('__vite_ping'))) {
        console.log('🔧 Blocking Vite client fetch:', url);
        return Promise.reject(new Error('Vite client disabled in cloud environment'));
      }
      return originalFetch.apply(this, args);
    };

    // Override WebSocket constructor to prevent Vite connections
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
      if (typeof url === 'string' && url.includes('fly.dev')) {
        console.log('🔧 Blocking Vite WebSocket connection:', url);
        // Return a mock WebSocket that doesn't actually connect
        const mockWS = {
          close: () => {},
          send: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
          readyState: 3, // CLOSED
          CONNECTING: 0,
          OPEN: 1,
          CLOSING: 2,
          CLOSED: 3,
        };
        setTimeout(() => {
          if (mockWS.onerror) mockWS.onerror(new Event('error'));
        }, 1);
        return mockWS;
      }
      return new OriginalWebSocket(url, protocols);
    };

    // Copy static properties
    Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);
    window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
    window.WebSocket.OPEN = OriginalWebSocket.OPEN;
    window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
    window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
  }

  // Handle unhandled promise rejections (like fetch failures)
  window.addEventListener('unhandledrejection', (event) => {
    // Check if it's a Vite HMR related error
    if (event.reason?.message?.includes('Failed to fetch') &&
        (event.reason?.stack?.includes('@vite/client') ||
         event.reason?.stack?.includes('ping') ||
         event.reason?.stack?.includes('waitForSuccessfulPing'))) {
      console.log('🔧 Vite HMR ping failed (suppressed in cloud environment)');
      event.preventDefault(); // Prevent the error from being logged to console
      return;
    }

    // Check for WebSocket-related errors
    if (event.reason?.message?.includes('WebSocket') ||
        event.reason?.stack?.includes('WebSocket')) {
      console.log('🔧 WebSocket connection issue (suppressed in cloud environment)');
      event.preventDefault();
      return;
    }

    // Check for Vite client disabled message
    if (event.reason?.message?.includes('Vite client disabled in cloud environment')) {
      event.preventDefault();
      return;
    }

    // Let other errors through normally
    console.error('Unhandled promise rejection:', event.reason);
  });

  // Handle regular JavaScript errors
  window.addEventListener('error', (event) => {
    // Check if it's a Vite HMR related error
    if (event.error?.stack?.includes('@vite/client') ||
        event.error?.stack?.includes('ping') ||
        event.message?.includes('Failed to fetch')) {
      console.log('🔧 Vite development error suppressed (cloud environment)');
      event.preventDefault();
      return;
    }

    // Let other errors through normally
    console.error('Global error:', event.error || event.message);
  });
}

// Detect if we're in a cloud environment
export function isCloudEnvironment(): boolean {
  return window.location.hostname.includes('fly.dev') ||
         window.location.hostname.includes('vercel.app') ||
         window.location.hostname.includes('netlify.app') ||
         window.location.hostname.includes('gitpod.io') ||
         window.location.hostname.includes('codespaces');
}
