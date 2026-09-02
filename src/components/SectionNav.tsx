'use client'

import { useEffect, useState } from 'react'
import './SectionNav.css'

// 首页左侧锚点导航(宽屏显示,滚动时高亮当前章节)
const SECTIONS = [
  { id: 'generator', label: '在线生成' },
  { id: 'history', label: '生成历史' },
  { id: 'features', label: '功能特性' },
  { id: 'tutorial', label: '使用教程' }
]

export default function SectionNav() {
  const [active, setActive] = useState('')

  useEffect(() => {
    // 按滚动位置计算当前章节:视口 35% 高度处落在哪个章节范围内就高亮哪个。
    // 不用 IntersectionObserver 的窄观察带,否则矮区块(如生成历史)会被跳过。
    const onScroll = () => {
      const probe = window.scrollY + window.innerHeight * 0.35
      let current = ''
      for (const { id } of SECTIONS) {
        const el = document.getElementById(id)
        if (!el) continue
        const top = el.getBoundingClientRect().top + window.scrollY
        if (top <= probe) current = id
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const jump = (id: string) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className="section-nav" aria-label="页面章节">
      {SECTIONS.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          className={active === id ? 'active' : ''}
          onClick={(e) => {
            e.preventDefault()
            jump(id)
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  )
}
