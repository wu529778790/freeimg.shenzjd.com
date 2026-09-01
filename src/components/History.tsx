'use client'

import { useEffect, useState } from 'react'
import type { HistoryItem } from '../types'
import './History.css'

interface HistoryProps {
  items: HistoryItem[]
  onClear: () => void
  onRemove: (id: string) => void
}

type ConfirmAction = { type: 'clear' } | { type: 'remove'; id: string }

export default function History({ items, onClear, onRemove }: HistoryProps) {
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmAction | null>(null)

  // 弹窗打开时支持 Esc 键关闭
  useEffect(() => {
    if (!pendingConfirm) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPendingConfirm(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingConfirm])

  if (items.length === 0) return null

  const handleDownload = (item: HistoryItem) => {
    const a = document.createElement('a')
    a.href = item.dataUrl
    a.download = `z-image-${item.id}.${item.ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleConfirm = () => {
    if (pendingConfirm?.type === 'clear') {
      onClear()
    } else if (pendingConfirm?.type === 'remove') {
      onRemove(pendingConfirm.id)
    }
    setPendingConfirm(null)
  }

  const confirmTitle = pendingConfirm?.type === 'clear' ? '清空历史记录' : '删除历史记录'
  const confirmText =
    pendingConfirm?.type === 'clear'
      ? '确定清空全部历史记录？删除后无法恢复。'
      : '确定删除这条历史记录？删除后无法恢复。'

  return (
    <>
      <section className="history" id="history">
        <div className="container">
          <div className="history-header">
            <h2>生成历史</h2>
            <button className="btn btn-ghost clear-btn" onClick={() => setPendingConfirm({ type: 'clear' })}>
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
                    onClick={() => setPendingConfirm({ type: 'remove', id: item.id })}
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

      {pendingConfirm && (
        <div className="confirm-overlay" onClick={() => setPendingConfirm(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">{confirmTitle}</div>
            <div className="confirm-text">{confirmText}</div>
            <div className="confirm-actions">
              <button className="btn btn-ghost" onClick={() => setPendingConfirm(null)}>
                取消
              </button>
              <button className="btn btn-danger" onClick={handleConfirm}>
                {pendingConfirm.type === 'clear' ? '清空' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}