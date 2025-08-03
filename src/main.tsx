import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupGlobalErrorHandling, isCloudEnvironment } from './utils/errorHandler'

// Set up error handling for cloud environments
if (isCloudEnvironment()) {
  console.log('🌐 Cloud environment detected, setting up error handling...');
  setupGlobalErrorHandling();
}

console.log('🚀 Starting React application...');

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('❌ Root element not found!');
} else {
  console.log('✅ Root element found, mounting React app...');
  try {
    createRoot(rootElement).render(<App />);
    console.log('✅ React app mounted successfully');
  } catch (error) {
    console.error('❌ Failed to mount React app:', error);
  }
}
