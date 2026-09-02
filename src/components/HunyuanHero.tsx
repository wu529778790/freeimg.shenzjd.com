// 与首页 Hero 同构(复用 Hero.css 全部样式):宣传混元「小程序成长计划」免费额度
import './Hero.css'

const STATS = [
  { value: '10万', label: '免费 AI 生图额度（张）' },
  { value: '10亿', label: '免费大模型 Token' },
  { value: '0', label: '使用门槛' }
]

export default function HunyuanHero() {
  return (
    <section className="hero" id="hunyuan-top">
      <div className="container hero-inner">
        <div className="hero-badge fade-in-up">
          <span className="badge-dot"></span>
          基于腾讯混元 3.0 · 微信「小程序成长计划」免费额度
        </div>

        <h1 className="hero-title fade-in-up">
          免费生成 <span className="gradient-text">10 万张</span> AI 图片
        </h1>

        <p className="hero-subtitle fade-in-up">
          白嫖微信「小程序成长计划」免费资源包：10 亿 Token + 10 万张 AI 生图，支持文生图、
          图生图与 AI 提示词润色。只需配置你自己的腾讯云密钥，即刻开启 AI 创作之旅。
        </p>

        <div className="hero-actions fade-in-up">
          <a href="#generator" className="btn btn-primary hero-btn">
            ✨ 立即开始生成
          </a>
          <a href="#help" className="btn btn-ghost hero-btn">
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
