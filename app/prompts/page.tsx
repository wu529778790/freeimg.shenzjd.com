import PromptCards from '@/src/components/PromptCards'
import { getCategories, getPrompts } from '@/lib/prompts'
import './prompts.css'

// 动态渲染:筛选/搜索/分页依赖 URL 参数,实时查 Turso
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24

// 分类维度分组
const DIMENSIONS = [
  { key: 'useCases', label: '用途' },
  { key: 'styles', label: '风格' },
  { key: 'subjects', label: '主体' }
]

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function PromptsPage({ searchParams }: PageProps) {
  const dimension =
    typeof searchParams.dimension === 'string' ? searchParams.dimension : 'all'
  const category =
    typeof searchParams.category === 'string' ? searchParams.category : 'all'
  const search = typeof searchParams.search === 'string' ? searchParams.search : ''
  const page = Math.max(1, Number(searchParams.page) || 1)

  const [result, categories] = await Promise.all([
    getPrompts({ page, pageSize: PAGE_SIZE, dimension, categoryId: category, search }),
    getCategories()
  ])

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))

  // 基于当前筛选条件构造链接 URL(支持局部覆盖参数)
  const buildUrl = (params: Record<string, string | number | null | undefined>) => {
    const sp = new URLSearchParams()
    if (dimension !== 'all') sp.set('dimension', dimension)
    if (category !== 'all') sp.set('category', category)
    if (search) sp.set('search', search)
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined || value === '') sp.delete(key)
      else sp.set(key, String(value))
    }
    const qs = sp.toString()
    return `/prompts${qs ? `?${qs}` : ''}`
  }

  const dimCategories = categories.filter((c) => c.dimension === dimension)

  return (
    <div className="prompts-page">
      <div className="container">
        <div className="prompts-header">
          <h1>AI 提示词库</h1>
        </div>

        {/* 搜索框(GET 表单,提交后重置筛选) */}
        <form action="/prompts" method="get" className="prompts-search">
          <input
            type="text"
            name="search"
            className="input"
            placeholder="搜索提示词，如：人像、海报、赛博朋克…"
            defaultValue={search}
          />
        </form>

        {/* 维度筛选 */}
        <div className="prompts-filter">
          <a
            href={buildUrl({ dimension: 'all', category: null, page: null })}
            className={`filter-chip ${dimension === 'all' ? 'active' : ''}`}
          >
            全部
          </a>
          {DIMENSIONS.map((d) => (
            <a
              key={d.key}
              href={buildUrl({ dimension: d.key, category: null, page: null })}
              className={`filter-chip ${dimension === d.key ? 'active' : ''}`}
            >
              {d.label}
            </a>
          ))}
        </div>

        {/* 分类筛选 */}
        {dimension !== 'all' && (
          <div className="prompts-categories">
            <a
              href={buildUrl({ category: null, page: null })}
              className={`filter-chip ${category === 'all' ? 'active' : ''}`}
            >
              全部分类
            </a>
            {dimCategories.map((c) => (
              <a
                key={c.id}
                href={buildUrl({ category: c.id, page: null })}
                className={`filter-chip ${String(category) === String(c.id) ? 'active' : ''}`}
              >
                {c.name}
                <span className="chip-count">{c.count}</span>
              </a>
            ))}
          </div>
        )}

        {/* 结果统计 */}
        <div className="prompts-count">
          共 {result.total.toLocaleString()} 条提示词
          {search && <span>（搜索“{search}”）</span>}
        </div>

        {/* 提示词网格 */}
        {result.list.length === 0 ? (
          <div className="prompts-empty">没有找到匹配的提示词，换个关键词试试</div>
        ) : (
          <PromptCards prompts={result.list} />
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="prompts-pagination">
            {page > 1 && (
              <a href={buildUrl({ page: page - 1 })} className="btn btn-ghost">
                ← 上一页
              </a>
            )}
            <span className="pagination-info">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <a href={buildUrl({ page: page + 1 })} className="btn btn-ghost">
                下一页 →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
