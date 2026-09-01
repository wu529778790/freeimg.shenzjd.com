import { getDb } from './turso'
import { rewriteImgUrl } from './cdn'
import type { PromptCategory, PromptItem } from '@/src/types'

/** 数据库行结构 */
interface PromptRow {
  id: number
  title: string
  description: string
  content: string
  translated_content: string
  slug: string
  author: string
  author_link: string
  source_link: string
  source_published_at: string
  media: string
  media_thumbnail: string
  language: string
  category_id: number | null
  category_name: string
  category_slug: string
  category_dimension: string
  featured: number
  views: number
  likes: number
  created_at: string
}

function toCategory(row: PromptRow): PromptCategory | null {
  if (!row.category_id) return null
  return {
    id: row.category_id,
    name: row.category_name,
    slug: row.category_slug,
    dimension: row.category_dimension
  }
}

function rowToPrompt(row: PromptRow): PromptItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    content: row.content,
    translatedContent: row.translated_content,
    slug: row.slug,
    author: row.author,
    authorLink: row.author_link,
    sourceLink: row.source_link,
    sourcePublishedAt: row.source_published_at,
    media: rewriteImgUrl(row.media),
    mediaThumbnail: rewriteImgUrl(row.media_thumbnail),
    language: row.language,
    category: toCategory(row),
    featured: !!row.featured,
    views: row.views,
    likes: row.likes
  }
}

const BASE_COLUMNS =
  'id, title, description, content, translated_content, slug, author, author_link, source_link, source_published_at, media, media_thumbnail, language, category_id, category_name, category_slug, category_dimension, featured, views, likes'

export interface PromptQuery {
  page?: number
  pageSize?: number
  dimension?: string
  categoryId?: number | string
  search?: string
}

/** 提示词列表查询(分页 + 筛选 + 搜索) */
export async function getPrompts(query: PromptQuery = {}): Promise<{
  list: PromptItem[]
  total: number
}> {
  const db = getDb()
  const page = Math.max(1, query.page || 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize || 24))

  const where: string[] = []
  const args: (string | number)[] = []

  if (query.dimension && query.dimension !== 'all') {
    where.push('category_dimension = ?')
    args.push(query.dimension)
  }
  if (query.categoryId && query.categoryId !== 'all') {
    where.push('category_id = ?')
    args.push(Number(query.categoryId))
  }
  if (query.search && query.search.trim()) {
    where.push('(title LIKE ? OR description LIKE ? OR translated_content LIKE ? OR content LIKE ?)')
    const kw = `%${query.search.trim()}%`
    args.push(kw, kw, kw, kw)
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

  const totalRes = await db.execute(`SELECT COUNT(*) AS cnt FROM prompts ${whereSql}`, args)
  const total = Number(totalRes.rows[0].cnt)

  const offset = (page - 1) * pageSize
  const listRes = await db.execute(
    `SELECT ${BASE_COLUMNS} FROM prompts ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...args, pageSize, offset]
  )

  return {
    list: listRes.rows.map((r) => rowToPrompt(r as unknown as PromptRow)),
    total
  }
}

/** 首页热门提示词:每个分类取 1 条(featured 优先、views 高优先),共 limit 条 */
export async function getHotPrompts(limit = 8): Promise<PromptItem[]> {
  const db = getDb()
  const res = await db.execute(
    `SELECT * FROM (
      SELECT ${BASE_COLUMNS}, ROW_NUMBER() OVER (
        PARTITION BY COALESCE(category_id, 0) ORDER BY featured DESC, views DESC, id DESC
      ) AS rn
      FROM prompts
    ) WHERE rn = 1 ORDER BY featured DESC, views DESC, id DESC LIMIT ?`,
    [limit]
  )
  return res.rows.map((r) => rowToPrompt(r as unknown as PromptRow))
}

/** 分类统计(用于提示词库筛选) */
export interface CategoryInfo {
  id: number
  name: string
  slug: string
  dimension: string
  count: number
}

export async function getCategories(): Promise<CategoryInfo[]> {
  const db = getDb()
  const res = await db.execute(
    `SELECT category_id AS id, category_name AS name, category_slug AS slug, category_dimension AS dimension, COUNT(*) AS count
     FROM prompts
     WHERE category_id IS NOT NULL
     GROUP BY category_id, category_name, category_slug, category_dimension
     ORDER BY dimension, id`
  )
  return res.rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    slug: String(r.slug),
    dimension: String(r.dimension),
    count: Number(r.count)
  }))
}
