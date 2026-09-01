import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="logo-icon">🎨</span>
          <span className="logo-text">GiteeFreeImg</span>
        </div>
        <p className="footer-desc">
          基于 Gitee AI 的免费 2K 图片生成工具，每天 1000 次免费额度。
        </p>
        <div className="footer-links">
          <a href="#features">功能特性</a>
          <a href="#generator">在线生成</a>
          <a href="#tutorial">使用教程</a>
        </div>
        <div className="footer-copyright">
          © {new Date().getFullYear()} GiteeFreeImg · 仅供学习交流使用
        </div>
      </div>
    </footer>
  )
}