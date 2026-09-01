'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PromptItem } from '../types'

interface PromptCardsProps {
  prompts: PromptItem[]
}

export default function PromptCards({ prompts }: PromptCardsProps) {
  const router = useRouter()
  const [copiedId, setCopiedId] = useState<number | null>(null)

  // 使用提示词:写入 sessionStorage 并跳回首页
  const handleUse = (p: PromptItem) => {
    const text = p.translatedContent || p.content
    sessionStorage.setItem('pending_prompt', text)
    router.push('/')
  }

  // 复制提示词
  const handleCopy = async (p: PromptItem) => {
    const text = p.translatedContent || p.content
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(p.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // 降级方案
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedId(p.id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  return (
    <div className="prompts-grid">
      {prompts.map((p) => (
        <div className="prompt-card" key={p.id}>
          {p.media && (
            <div className="prompt-card-img">
              <img src={p.mediaThumbnail || p.media} alt={p.title} loading="lazy" />
            </div>
          )}
          <div className="prompt-card-body">
            <div className="prompt-card-title">{p.title}</div>
            {p.description && <div className="prompt-card-desc">{p.description}</div>}
            <div className="prompt-card-meta">
              {p.category && <span className="prompt-tag">{p.category.name}</span>}
              {p.author && <span className="prompt-author">@{p.author}</span>}
            </div>
            <div className="prompt-card-actions">
              <button className="btn btn-primary prompt-btn" onClick={() => handleUse(p)}>
                ✨ 使用生成
              </button>
              <button className="btn btn-ghost prompt-btn" onClick={() => handleCopy(p)}>
                {copiedId === p.id ? '✓ 已复制' : '📋 复制'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
