import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // In dev, proxy /api calls to the Express backend
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
