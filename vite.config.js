import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev'de /api/eml-proxy?path=... → emajorleague.com/...
      '/api/eml-proxy': {
        target: 'https://emajorleague.com',
        changeOrigin: true,
        rewrite: (path) => {
          const match = path.match(/[?&]path=([^&]+)/);
          return match ? decodeURIComponent(match[1]) : '/';
        },
        secure: true,
        timeout: 8000,
        proxyTimeout: 8000,
      },
    },
  },
})
