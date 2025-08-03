// Vite client override for cloud environments
(function() {
  'use strict';
  
  // Detect cloud environment
  const isCloud = window.location.hostname.includes('fly.dev') ||
                  window.location.hostname.includes('vercel.app') ||
                  window.location.hostname.includes('netlify.app') ||
                  window.location.hostname.includes('gitpod.io') ||
                  window.location.hostname.includes('codespaces');
  
  if (!isCloud) return;
  
  console.log('🌐 Cloud environment detected - overriding Vite client');
  
  // Store original functions
  const originalFetch = window.fetch;
  const OriginalWebSocket = window.WebSocket;
  
  // Override fetch to block Vite requests
  window.fetch = function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    if (url && (url.includes('/@vite/') || url.includes('__vite_ping') || url.includes('/@fs/'))) {
      return Promise.reject(new Error('Vite request blocked in cloud environment'));
    }
    return originalFetch.call(this, input, init);
  };
  
  // Override WebSocket to block Vite connections
  window.WebSocket = function(url, protocols) {
    if (typeof url === 'string' && (url.includes('fly.dev') || url.includes('ws://') || url.includes('wss://'))) {
      // Create a mock WebSocket that immediately fails
      const mock = {
        close: function() {},
        send: function() {},
        addEventListener: function(type, listener) {
          if (type === 'error' && listener) {
            setTimeout(() => listener(new Event('error')), 1);
          }
        },
        removeEventListener: function() {},
        dispatchEvent: function() { return false; },
        readyState: 3, // CLOSED
        url: url,
        protocol: '',
        extensions: '',
        bufferedAmount: 0,
        binaryType: 'blob',
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null,
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3
      };
      
      // Trigger error event asynchronously
      setTimeout(() => {
        if (mock.onerror) {
          mock.onerror(new Event('error'));
        }
      }, 1);
      
      return mock;
    }
    return new OriginalWebSocket(url, protocols);
  };
  
  // Copy static properties
  window.WebSocket.CONNECTING = 0;
  window.WebSocket.OPEN = 1;
  window.WebSocket.CLOSING = 2;
  window.WebSocket.CLOSED = 3;
  
  // Suppress console errors for known Vite issues
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('Failed to fetch') && 
        (message.includes('@vite/client') || message.includes('ping'))) {
      return; // Suppress Vite client errors
    }
    if (message.includes('WebSocket connection') && message.includes('failed')) {
      return; // Suppress WebSocket errors
    }
    originalConsoleError.apply(console, args);
  };
  
})();
