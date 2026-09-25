'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import './PageTabs.css'

// 站点导航(site-navbar)下方的二级选项卡:本站三个页面入口。
// 顶部导航是兄弟站点间的跳转,这条负责站内切换,滚动时吸顶。
const TABS: { label: string; href: string; badge?: string }[] = [
  { label: 'Z-Image 生图', href: '/', badge: '无限制' },
  { label: '混元生图', href: '/hunyuan', badge: '免费' },
  { label: '提示词库', href: '/prompts' }
]

export default function PageTabs() {
  const pathname = usePathname()

  return (
    <nav className="page-tabs" aria-label="本站页面">
      <div className="page-tabs-inner">
        {TABS.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : !!pathname?.startsWith(tab.href)
          const cls = `page-tab${active ? ' active' : ''}`
          return (
            <Link key={tab.href} href={tab.href} className={cls}>
              {tab.label}
              {tab.badge && <span className="page-tab-badge">{tab.badge}</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
