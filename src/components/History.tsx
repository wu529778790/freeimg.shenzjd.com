'use client'

import { useEffect, useState } from 'react'
import type { HistoryItem } from '../types'
import './History.css'

interface HistoryProps {
  items: HistoryItem[]
  onClear: () => void
  onRemove: (id: string) => void
}

export default function History({ items, onClear, onRemove }: HistoryProps) {
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)

  // 弹窗打开时支持 Esc 键关闭
  useEffect(() => {
    if (!pendingRemoveId) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPendingRemoveId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingRemoveId])

  if (items.length === 0) return null

  const handleDownload = (item: HistoryItem) => {
    const a = document.createElement('a')
    a.href = item.dataUrl
    a.download = `z-image-${item.id}.${item.ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleConfirmRemove = () => {
    if (pendingRemoveId) {
      onRemove(pendingRemoveId)
    }
    setPendingRemoveId(null)
  }

  return (
    <>
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
                  <button
                    className="history-remove"
                    onClick={() => setPendingRemoveId(item.id)}
                    aria-label="删除这条记录"
                    title="删除"
                  >
                    ×
                  </button>
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

      {pendingRemoveId && (
        <div className="confirm-overlay" onClick={() => setPendingRemoveId(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">删除历史记录</div>
            <div className="confirm-text">确定删除这条历史记录？删除后无法恢复。</div>
            <div className="confirm-actions">
              <button className="btn btn-ghost" onClick={() => setPendingRemoveId(null)}>
                取消
              </button>
              <button className="btn btn-danger" onClick={handleConfirmRemove}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}