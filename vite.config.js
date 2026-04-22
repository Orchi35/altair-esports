import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // /eml-proxy/* → emajorleague.com/*  (CORS bypass in dev)
      '/eml-proxy': {
        target: 'https://emajorleague.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/eml-proxy/, ''),
        secure: true,
        timeout: 8000,
        proxyTimeout: 8000,
      },
    },
  },
})
