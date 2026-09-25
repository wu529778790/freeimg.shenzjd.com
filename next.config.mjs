/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone 模式:输出可独立运行的服务(用于 Docker 部署)
  output: 'standalone',
  // 三个页面内容公开且几乎不变,让 EdgeOne 等 CDN 缓存 HTML:
  // s-maxage 内 CDN 直接命中;过期后 stale-while-revalidate 先返回旧页再回源刷新
  async headers() {
    const htmlCache = [
      {
        key: 'Cache-Control',
        value: 'public, s-maxage=600, stale-while-revalidate=3600'
      }
    ]
    return [
      { source: '/', headers: htmlCache },
      { source: '/hunyuan', headers: htmlCache },
      { source: '/prompts', headers: htmlCache }
    ]
  },
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
