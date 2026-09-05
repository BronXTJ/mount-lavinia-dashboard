import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

const workerTarget = 'http://127.0.0.1:8787'
const stripProxyPrefix = (path) =>
  path.replace(/^\/mount-lavinia-dashboard\/what-if-api/, '').replace(/^\/what-if-api/, '')

const whatIfProxy = {
  '/what-if-api': {
    target: workerTarget,
    changeOrigin: true,
    rewrite: stripProxyPrefix,
  },
  '/mount-lavinia-dashboard/what-if-api': {
    target: workerTarget,
    changeOrigin: true,
    rewrite: stripProxyPrefix,
  },
}

export default defineConfig({
  base: '/mount-lavinia-dashboard/',
  plugins: [
    react(),
    visualizer({ filename: 'stats.html', open: false, gzipSize: true }),
  ],
  server: {
    proxy: whatIfProxy,
  },
  preview: {
    proxy: whatIfProxy,
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'leaflet'
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'recharts'
          }
          if (id.includes('node_modules/d3/')) {
            return 'd3'
          }
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
  },
})
