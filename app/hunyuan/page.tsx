import type { Metadata } from 'next'
import HunyuanSection from '@/src/components/HunyuanSection'
import './hunyuan.css'

export const metadata: Metadata = {
  title: '混元生图 - FreeImg',
  description:
    '基于腾讯混元大模型 3.0 的免费 AI 图片生成，支持文生图、图生图与 AI 提示词润色，由微信云开发额度免费提供。',
  keywords: ['混元生图', '腾讯混元', 'AI 图片生成', '图生图', '免费生图', '提示词润色']
}

// 提示词相关内容统一在 /prompts 页展示,本页只保留生成工作台
export default function HunyuanPage() {
  return (
    <div className="hunyuan-page">
      <section className="hunyuan-hero">
        <div className="container">
          <h1 className="hunyuan-title">
            混元生图 <span className="hunyuan-badge">可自带腾讯云额度</span>
          </h1>
          <p className="hunyuan-subtitle">
            腾讯混元 3.0 模型 · 文生图 / 图生图 / AI 提示词润色 · 配置你自己的腾讯云密钥，即可使用你的「小程序成长计划」免费额度（10 亿 Token + 10 万张图）
          </p>
        </div>
      </section>

      <HunyuanSection />

      {/* 页脚:免费额度来源说明 */}
      <section className="hunyuan-plan-note">
        <div className="container">
          <p>
            本页免费额度由微信「小程序成长计划」免费资源包提供（绑定 CloudBase 环境），规则详见{' '}
            <a
              href="https://docs.cloudbase.net/ai/ai-inspire-plan"
              target="_blank"
              rel="noopener noreferrer"
            >
              官方帮助文档 →
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}
