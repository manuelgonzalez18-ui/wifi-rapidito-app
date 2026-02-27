import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // Copy public files but exclude large binary files not needed in the Android APK
    copyPublicDir: true,
    rollupOptions: {
      // No changes needed here for exclusion
    },
  },
  // Exclude large files from copying to dist (they will only live on Hostinger, not in APK)
  publicDir: 'public',
  server: {
    proxy: {
      '/api': {
        target: 'https://api.wisphub.app/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false
      }
    }
  }
})

