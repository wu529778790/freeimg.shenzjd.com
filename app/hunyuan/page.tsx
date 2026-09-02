import type { Metadata } from 'next'
import SectionNav from '@/src/components/SectionNav'
import HunyuanHero from '@/src/components/HunyuanHero'
import HunyuanSection from '@/src/components/HunyuanSection'
import HunyuanHelp from '@/src/components/HunyuanHelp'
import './hunyuan.css'

export const metadata: Metadata = {
  title: '混元生图 - FreeImg',
  description:
    '基于腾讯混元 3.0 的免费 AI 图片生成：配置你自己的腾讯云密钥，即可使用微信「小程序成长计划」的 10 亿 Token + 10 万张图免费额度，支持文生图、图生图与 AI 提示词润色。',
  keywords: ['混元生图', '腾讯混元', '小程序成长计划', 'AI 图片生成', '图生图', '免费生图', '提示词润色']
}

// 与首页同构:左侧锚点导航 + 宣传话术 → 真实生图工作台(自带密钥配置)+ 历史记录 → 帮助中心
export default function HunyuanPage() {
  return (
    <div className="hunyuan-page">
      <SectionNav
        sections={[
          { id: 'generator', label: '在线生成' },
          { id: 'history', label: '生成历史' },
          { id: 'help', label: '帮助中心' }
        ]}
      />
      <HunyuanHero />
      <HunyuanSection />
      <HunyuanHelp />
    </div>
  )
}
