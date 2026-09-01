import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Docker + nginx 部署，nginx 反代去掉路径前缀，容器内使用根路径
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  }
})