/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone 模式:输出可独立运行的服务(用于 Docker 部署)
  output: 'standalone',
  // 关闭遥测
  // 构建时忽略 ESLint 检查(组件代码从 Vite 迁移而来)
  eslint: {
    ignoreDuringBuilds: true
  }
}

export default nextConfig
