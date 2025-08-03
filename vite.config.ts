import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Detect cloud environment more comprehensively
  const isCloudEnvironment = process.env.NODE_ENV === 'production' ||
                           process.env.HOSTNAME?.includes('fly.dev') ||
                           process.env.CODESPACE_NAME ||
                           process.env.GITPOD_WORKSPACE_ID ||
                           process.env.REPL_ID ||
                           process.env.RAILWAY_ENVIRONMENT ||
                           process.env.VERCEL;

  console.log('Vite Config - Cloud Environment:', isCloudEnvironment);

  const config = {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Pass cloud environment flag to client code
      __IS_CLOUD_ENV__: JSON.stringify(isCloudEnvironment),
    },
  };

  if (isCloudEnvironment) {
    // More aggressive approach for cloud environments
    config.server = {
      ...config.server,
      hmr: false,
      ws: false, // Disable WebSocket server entirely
      middlewareMode: false,
    };

    // Force disable in optimizeDeps
    config.optimizeDeps = {
      disabled: false,
      force: true,
    };
  } else {
    config.server.hmr = {
      overlay: false,
      port: 8080,
    };
  }

  return config;
});
