import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { matchCenterDevApi } from "./server/match-center/vitePlugin.js";

export default defineConfig({
  cacheDir: "./.vite-cache",
  plugins: [react(), matchCenterDevApi()],
  server: {
    proxy: {
      "/api/eml-proxy": {
        target: "https://emajorleague.com",
        changeOrigin: true,
        rewrite: (path) => {
          const match = path.match(/[?&]path=([^&]+)/);
          return match ? decodeURIComponent(match[1]) : "/";
        },
        secure: true,
        timeout: 8000,
        proxyTimeout: 8000,
      },
    },
  },
});
