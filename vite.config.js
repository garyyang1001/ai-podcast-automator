
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // Node.js 'path' module for resolving paths

// Vite config file (vite.config.js)
// This file is processed by Vite in a Node.js environment.

export default defineConfig(({ mode }) => {
  // Load environment variables from .env file in the project root.
  const env = loadEnv(mode, path.resolve('.'), '');

  return {
    plugins: [
      react(), // Enables React support (Fast Refresh, JSX transpilation, etc.)
    ],
    define: {
      // This makes specified environment variables available in your client-side code
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.FIRECRAWL_API_KEY': JSON.stringify(env.FIRECRAWL_API_KEY),
      'process.env.GOOGLE_CLOUD_TTS_API_KEY': JSON.stringify(env.GOOGLE_CLOUD_TTS_API_KEY),
      'process.env.VERTEX_AI_PROJECT_ID': JSON.stringify(env.VERTEX_AI_PROJECT_ID),
      'process.env.VERTEX_AI_REGION': JSON.stringify(env.VERTEX_AI_REGION),
    },
  };
});