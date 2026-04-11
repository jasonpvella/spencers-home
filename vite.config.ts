import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) return 'firebase';
          if (['react', 'react-dom', 'react-router-dom', 'zustand'].some(p => id.includes(`/node_modules/${p}/`))) return 'vendor';
        },
      },
    },
  },
})
