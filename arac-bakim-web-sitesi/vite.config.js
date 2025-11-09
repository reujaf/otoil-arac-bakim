import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages için base path
const basePath = process.env.NODE_ENV === 'production' ? '/otoil-arac-bakim/' : '/';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: basePath,
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    },
    outDir: 'dist'
  },
  publicDir: 'public',
  define: {
    'import.meta.env.BASE_URL': JSON.stringify(basePath)
  }
})
