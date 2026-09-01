import './Hero.css'

const STATS = [
  { value: '100', label: '每日免费生成张数' },
  { value: '2K', label: '高清图片分辨率' },
  { value: '0', label: '使用门槛' }
]

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container hero-inner">
        <div className="hero-badge fade-in-up">
          <span className="badge-dot"></span>
          基于 Gitee AI · 完全免费
        </div>

        <h1 className="hero-title fade-in-up">
          免费生成 <span className="gradient-text">2K 高清</span> 图片
        </h1>

        <p className="hero-subtitle fade-in-up">
          白嫖 Gitee AI 的 Z-Image-Turbo 模型，每天可免费生成 100 张 2K 图片，无任何限制。
          只需一个 API Key，即刻开启你的 AI 创作之旅。
        </p>

        <div className="hero-actions fade-in-up">
          <a href="#generator" className="btn btn-primary hero-btn">
            ✨ 立即开始生成
          </a>
          <a href="#tutorial" className="btn btn-ghost hero-btn">
            📖 查看教程
          </a>
        </div>

        <div className="hero-stats fade-in-up">
          {STATS.map((stat) => (
            <div className="stat-item" key={stat.label}>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}