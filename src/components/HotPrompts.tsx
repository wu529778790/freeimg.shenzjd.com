import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usePrompts } from '../utils/usePrompts'
import type { PromptItem } from '../types'
import './HotPrompts.css'

interface HotPromptsProps {
  onUsePrompt: (prompt: string) => void
}

export default function HotPrompts({ onUsePrompt }: HotPromptsProps) {
  const { data } = usePrompts()
  const prompts = data?.prompts || []

  // 精选热门提示词：优先 featured，否则从不同分类各取 1 条，保证多样性
  const hotPrompts = useMemo(() => {
    const featured = prompts.filter((p) => p.featured)
    if (featured.length >= 8) return featured.slice(0, 8)

    // 按分类分组，从每个分类取 1 条，直到凑满 8 条
    const byCategory = new Map<string, PromptItem[]>()
    for (const p of prompts) {
      const key = p.category?.name || '其他'
      if (!byCategory.has(key)) byCategory.set(key, [])
      if (byCategory.get(key)!.length < 1) byCategory.get(key)!.push(p)
    }
    const result: PromptItem[] = []
    const categories = Array.from(byCategory.values())
    let i = 0
    while (result.length < 8 && categories.length > 0) {
      const cat = categories[i % categories.length]
      if (cat.length > 0) {
        result.push(cat.shift()!)
      }
      i++
      if (i > 100) break
    }
    return result
  }, [prompts])

  return (
    <section className="hot-prompts" id="hot-prompts">
      <div className="container">
        <div className="section-header">
          <h2>热门提示词</h2>
          <p>精选优质提示词，点击即可一键生成</p>
        </div>

        <div className="hot-prompts-grid">
          {hotPrompts.map((p) => (
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
                  onClick={() => onUsePrompt(p.translatedContent || p.content)}
                >
                  ✨ 立即生成
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="hot-prompts-more">
          <Link to="/prompts" className="btn btn-ghost">
            查看全部提示词 →
          </Link>
        </div>
      </div>
    </section>
  )
}