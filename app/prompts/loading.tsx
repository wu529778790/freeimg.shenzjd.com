// /prompts 的加载骨架:页面是 force-dynamic 实时查库,导航期间先渲染这个,点击即刻有反馈。
export default function PromptsLoading() {
  return (
    <div className="prompts-page">
      <div className="container">
        <div className="prompts-header">
          <h1>AI 提示词库</h1>
        </div>

        <div className="skeleton skeleton-search" />

        <div className="prompts-categories">
          {[0, 1, 2].map((d) => (
            <div key={d} className="category-group">
              <span className="skeleton skeleton-label" />
              <div className="category-group-chips">
                {Array.from({ length: d === 1 ? 6 : 4 }, (_, i) => (
                  <span key={i} className="skeleton skeleton-chip" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="prompts-grid">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      </div>
    </div>
  )
}
