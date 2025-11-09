import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cloudflare Pages için base path (GitHub Pages için '/otoil-arac-bakim/' idi)
// Cloudflare Pages'de base path '/' olmalı
const basePath = process.env.NODE_ENV === 'production' ? '/' : '/';

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
  publicDir: 'public'
})
