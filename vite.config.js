import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/mount-lavinia-dashboard/',
  plugins: [react()],
  server: {
    proxy: {
      '/what-if-api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/what-if-api/, ''),
      },
    },
  },
})
