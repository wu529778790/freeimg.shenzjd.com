/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone 模式:输出可独立运行的服务(用于 Docker 部署)
  output: 'standalone',
  // 关闭遥测
  // 构建时忽略 ESLint 检查(组件代码从 Vite 迁移而来)
  eslint: {
    ignoreDuringBuilds: true
  },
  // CloudBase Node SDK 含动态依赖,不参与打包,运行时直接 require
  experimental: {
    serverComponentsExternalPackages: ['@cloudbase/node-sdk']
  }
}

export default nextConfig
