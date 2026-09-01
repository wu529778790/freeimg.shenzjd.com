import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 部署在子路径下，需要设置 base 为仓库名
  base: '/GiteeFreeImg/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  }
})