'use client'

import type { HistoryItem } from '../types'
import './History.css'

interface HistoryProps {
  items: HistoryItem[]
  onClear: () => void
}

export default function History({ items, onClear }: HistoryProps) {
  if (items.length === 0) return null

  const handleDownload = (item: HistoryItem) => {
    const a = document.createElement('a')
    a.href = item.dataUrl
    a.download = `z-image-${item.id}.${item.ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <section className="history" id="history">
      <div className="container">
        <div className="history-header">
          <h2>生成历史</h2>
          <button className="btn btn-ghost clear-btn" onClick={onClear}>
            清空记录
          </button>
        </div>

        <div className="history-grid">
          {items.map((item) => (
            <div className="history-card" key={item.id}>
              <div className="history-img-wrap">
                <img src={item.dataUrl} alt={item.prompt} loading="lazy" />
              </div>
              <div className="history-info">
                <div className="history-prompt" title={item.prompt}>
                  {item.prompt}
                </div>
                <div className="history-meta-row">
                  <span className="history-size">{item.sizeLabel}</span>
                  <span className="history-time">
                    {new Date(item.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <button
                  className="btn btn-ghost history-download"
                  onClick={() => handleDownload(item)}
                >
                  ⬇ 下载
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}