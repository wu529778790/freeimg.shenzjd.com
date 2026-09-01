import type { Metadata } from 'next'
import Script from 'next/script'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import './globals.css'

export const metadata: Metadata = {
  title: 'FreeImg - 免费 2K 图片生成器',
  description:
    '基于 Gitee AI 的免费 2K 图片生成工具，每天可免费生成 100 张，支持多种尺寸，附 18000+ AI 提示词库。',
  keywords: ['AI 图片生成', '免费图片生成', 'Gitee AI', '2K 图片', '提示词库'],
  openGraph: {
    title: 'FreeImg - 免费 2K 图片生成器',
    description: '白嫖 Gitee AI 的 Z-Image-Turbo 模型，每天 100 张 2K 免费图片。'
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/vite.svg" />
      </head>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
        {/* 公众号 + 小程序浮窗 */}
        <Script
          src="https://unpkg.com/@wu529778790/floating-qr@latest/dist/floating-qr.wc.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
