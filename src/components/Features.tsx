import './Features.css'

const FEATURES = [
  {
    icon: '⚡',
    title: '极速生成',
    desc: '基于 Z-Image-Turbo 模型，快速生成高清图片，无需漫长等待。'
  },
  {
    icon: '🆓',
    title: '完全免费',
    desc: '每天 100 张免费生成额度，2K 高清分辨率，无任何隐藏费用。'
  },
  {
    icon: '🔒',
    title: '隐私安全',
    desc: 'API Key 仅保存在本地浏览器，不会上传到任何第三方服务器。'
  },
  {
    icon: '🎨',
    title: '多尺寸支持',
    desc: '支持方形、横版、竖版等多种尺寸，满足不同场景需求。'
  },
  {
    icon: '📚',
    title: '历史记录',
    desc: '自动保存生成记录，随时回看和下载之前的作品。'
  },
  {
    icon: '📱',
    title: '多端适配',
    desc: '响应式设计，在电脑、平板、手机上都能流畅使用。'
  }
]

export default function Features() {
  return (
    <section className="features" id="features">
      <div className="container">
        <div className="section-header">
          <h2>功能特性</h2>
          <p>为什么选择 Z-Image-Turbo 图片生成器</p>
        </div>

        <div className="features-grid">
          {FEATURES.map((feature) => (
            <div className="feature-card" key={feature.title}>
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}