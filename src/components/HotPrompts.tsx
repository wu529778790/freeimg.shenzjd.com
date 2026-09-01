'use client'

import Link from 'next/link'
import type { PromptItem } from '../types'
import './HotPrompts.css'

interface HotPromptsProps {
  prompts: PromptItem[]
}

export default function HotPrompts({ prompts }: HotPromptsProps) {
  // 使用提示词:写入 sessionStorage 并触发事件让 Generator 读取
  const handleUsePrompt = (prompt: string) => {
    sessionStorage.setItem('pending_prompt', prompt)
    window.dispatchEvent(new Event('use-prompt'))
  }

  return (
    <section className="hot-prompts" id="hot-prompts">
      <div className="container">
        <div className="section-header">
          <h2>热门提示词</h2>
          <p>精选优质提示词，点击即可一键生成</p>
        </div>

        <div className="hot-prompts-grid">
          {prompts.map((p) => (
            <div className="hot-prompt-card" key={p.id}>
              {p.media && (
                <div className="hot-prompt-img">
                  <img src={p.mediaThumbnail || p.media} alt={p.title} loading="lazy" />
                </div>
              )}
              <div className="hot-prompt-body">
                <div className="hot-prompt-title">{p.title}</div>
                {p.category && <span className="hot-prompt-tag">{p.category.name}</span>}
                <button
                  className="btn btn-primary hot-prompt-btn"
                  onClick={() => handleUsePrompt(p.translatedContent || p.content)}
                >
                  ✨ 立即生成
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="hot-prompts-more">
          <Link href="/prompts" className="btn btn-ghost">
            查看全部提示词 →
          </Link>
        </div>
      </div>
    </section>
  )
}
