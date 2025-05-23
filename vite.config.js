import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 代理Gemini API請求
      '/api/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
        secure: true,
        headers: {
          'Origin': 'https://generativelanguage.googleapis.com'
        }
      },
      // 代理Firecrawl API請求  
      '/api/firecrawl': {
        target: 'https://api.firecrawl.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/firecrawl/, ''),
        secure: true
      }
    }
  },
  define: {
    // 確保環境變數在瀏覽器中可用
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.FIRECRAWL_API_KEY': JSON.stringify(process.env.FIRECRAWL_API_KEY),
  }
})