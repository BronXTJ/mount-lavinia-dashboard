import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
  plugins: [react()],
  server: {
    proxy: whatIfProxy,
  },
  preview: {
    proxy: whatIfProxy,
  },
})
