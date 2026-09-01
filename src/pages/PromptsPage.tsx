import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePrompts } from '../utils/usePrompts'
import type { PromptItem } from '../types'
import './PromptsPage.css'

// 分类维度分组
const DIMENSIONS = [
  { key: 'useCases', label: '用途' },
  { key: 'styles', label: '风格' },
  { key: 'subjects', label: '主体' }
]

export default function PromptsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [activeDimension, setActiveDimension] = useState<string>('all')
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const { data, loading, error } = usePrompts()
  const prompts = data?.prompts || []

  // 提取所有分类
  const categories = useMemo(() => {
    const map = new Map<string, { id: number; name: string; dimension: string; count: number }>()
    for (const p of prompts) {
      if (!p.category) continue
      const key = `${p.category.dimension}-${p.category.id}`
      const existing = map.get(key)
      if (existing) {
        existing.count++
      } else {
        map.set(key, {
          id: p.category.id,
          name: p.category.name,
          dimension: p.category.dimension,
          count: 1
        })
      }
    }
    return Array.from(map.values())
  }, [prompts])

  // 过滤后的提示词
  const filtered = useMemo(() => {
    let list = prompts
    if (activeDimension !== 'all') {
      list = list.filter((p) => p.category?.dimension === activeDimension)
    }
    if (activeCategory !== 'all') {
      list = list.filter((p) => `${p.category?.dimension}-${p.category?.id}` === activeCategory)
    }
    if (search.trim()) {
      const kw = search.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(kw) ||
          p.description.toLowerCase().includes(kw) ||
          p.translatedContent.toLowerCase().includes(kw) ||
          p.content.toLowerCase().includes(kw)
      )
    }
    return list
  }, [prompts, activeDimension, activeCategory, search])

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

  // 使用此提示词（跳回首页并填入）
  const handleUse = (p: PromptItem) => {
    const text = p.translatedContent || p.content
    // 通过 sessionStorage 传递提示词
    sessionStorage.setItem('pending_prompt', text)
    navigate('/')
  }

  return (
    <div className="prompts-page">
      <div className="container">
        <div className="prompts-header">
          <h1>AI 提示词库</h1>
          <p>精选 {prompts.length} 条 GPT Image 2 提示词，点击即可一键生成</p>
        </div>

        {/* 搜索框 */}
        <div className="prompts-search">
          <input
            type="text"
            className="input"
            placeholder="搜索提示词，如：人像、海报、赛博朋克…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              // 搜索时重置分类筛选，避免叠加过滤让用户困惑
              if (e.target.value.trim()) {
                setActiveDimension('all')
                setActiveCategory('all')
              }
            }}
          />
        </div>

        {/* 维度筛选 */}
        <div className="prompts-filter">
          <button
            className={`filter-chip ${activeDimension === 'all' ? 'active' : ''}`}
            onClick={() => {
              setActiveDimension('all')
              setActiveCategory('all')
            }}
          >
            全部
          </button>
          {DIMENSIONS.map((d) => (
            <button
              key={d.key}
              className={`filter-chip ${activeDimension === d.key ? 'active' : ''}`}
              onClick={() => {
                setActiveDimension(d.key)
                setActiveCategory('all')
              }}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* 分类筛选 */}
        {activeDimension !== 'all' && (
          <div className="prompts-categories">
            {categories
              .filter((c) => c.dimension === activeDimension)
              .map((c) => {
                const key = `${c.dimension}-${c.id}`
                return (
                  <button
                    key={key}
                    className={`filter-chip ${activeCategory === key ? 'active' : ''}`}
                    onClick={() => setActiveCategory(activeCategory === key ? 'all' : key)}
                  >
                    {c.name}
                    <span className="chip-count">{c.count}</span>
                  </button>
                )
              })}
          </div>
        )}

        {/* 结果统计 */}
        <div className="prompts-count">共 {filtered.length} 条提示词</div>

        {/* 加载中 */}
        {loading && <div className="prompts-empty">正在加载提示词…</div>}

        {/* 加载失败 */}
        {!loading && error && <div className="prompts-empty">加载失败：{error}</div>}

        {/* 提示词网格 */}
        {!loading && !error && filtered.length === 0 && (
          <div className="prompts-empty">没有找到匹配的提示词，换个关键词试试</div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="prompts-grid">
            {filtered.map((p) => (
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
        )}
      </div>
    </div>
  )
}