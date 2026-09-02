'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WxAuth } from 'wx-auth-sdk'
import { UserAvatar } from '@wu529778790/user-avatar'
import 'wx-auth-sdk/dist/style.css'
import '@wu529778790/user-avatar/style.css'
import { initWxAuth, WX_AUTH_API_BASE } from '../utils/wxauth-client'
import './Navbar.css'

// 扁平三项:两个生成器 + 提示词库;头像(登录)固定最右
export default function Navbar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isHome = pathname === '/'
  const avatarRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    initWxAuth()
  }, [])

  // 头像账号组件:未登录显示「登录」占位,已登录显示头像+下拉菜单(设置/退出)
  useEffect(() => {
    const host = avatarRef.current
    if (!host) return
    const avatar = new UserAvatar(
      {
        sdk: WxAuth,
        apiBase: WX_AUTH_API_BASE,
        fixed: false,
        size: '2.2rem'
      },
      host
    )
    avatar.mount(host)
    return () => avatar.destroy()
  }, [])

  const handleClick = () => setOpen(false)

  const LINKS = [
    { label: 'Z-Image 生图', href: isHome ? '#generator' : '/', active: isHome },
    { label: '混元生图', href: '/hunyuan', active: pathname === '/hunyuan' },
    { label: '提示词库', href: '/prompts', active: pathname === '/prompts' }
  ]

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link href="/" className="navbar-logo" onClick={handleClick}>
          <span className="logo-icon">🎨</span>
          <span className="logo-text">FreeImg</span>
        </Link>

        <nav className={`navbar-links ${open ? 'open' : ''}`}>
          {LINKS.map((link) =>
            link.href.startsWith('/') ? (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleClick}
                className={link.active ? 'active' : ''}
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                onClick={handleClick}
                className={link.active ? 'active' : ''}
              >
                {link.label}
              </a>
            )
          )}
          <div className="navbar-avatar" ref={avatarRef} />
        </nav>

        <button
          className="navbar-toggle"
          aria-label="菜单"
          onClick={() => setOpen(!open)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  )
}
