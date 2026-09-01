import { useState } from 'react'
import './Navbar.css'

const NAV_LINKS = [
  { label: '功能特性', href: '#features' },
  { label: '在线生成', href: '#generator' },
  { label: '使用教程', href: '#tutorial' }
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <a href="#top" className="navbar-logo" onClick={() => setOpen(false)}>
          <span className="logo-icon">🎨</span>
          <span className="logo-text">GiteeFreeImg</span>
        </a>

        <nav className={`navbar-links ${open ? 'open' : ''}`}>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <a href="#generator" className="navbar-cta" onClick={() => setOpen(false)}>
            立即使用
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