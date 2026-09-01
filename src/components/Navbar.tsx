import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Navbar.css'

const NAV_LINKS = [
  { label: '功能特性', href: '#features' },
  { label: '在线生成', href: '#generator' },
  { label: '提示词库', href: '/prompts', route: true },
  { label: '使用教程', href: '#tutorial' }
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const isHome = location.pathname === '/'

  const handleClick = () => setOpen(false)

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-logo" onClick={handleClick}>
          <span className="logo-icon">🎨</span>
          <span className="logo-text">FreeImg</span>
        </Link>

        <nav className={`navbar-links ${open ? 'open' : ''}`}>
          {NAV_LINKS.map((link) =>
            link.route ? (
              <Link key={link.href} to={link.href} onClick={handleClick}>
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={isHome ? link.href : `/${link.href}`}
                onClick={handleClick}
              >
                {link.label}
              </a>
            )
          )}
          <Link to="/" className="navbar-cta" onClick={handleClick}>
            立即使用
          </Link>
          <a
            href="https://github.com/wu529778790/freeimg.shenzjd.com"
            className="navbar-github"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub 仓库"
            title="GitHub 仓库"
            onClick={handleClick}
          >
            <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
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