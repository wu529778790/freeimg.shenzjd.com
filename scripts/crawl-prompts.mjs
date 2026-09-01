/**
 * 提示词爬虫脚本
 * 从 youmind.com 的公开 API 爬取 GPT Image 2 提示词数据
 *
 * 数据源：POST https://youmind.com/youmarketing-api/prompt-category-prompts
 * 需要 Referer 和 Origin 头，否则返回 403
 *
 * 用法：
 *   node scripts/crawl-prompts.mjs                # 爬取全部
 *   node scripts/crawl-prompts.mjs --limit 100    # 只爬取前 100 条（验证用）
 *   node scripts/crawl-prompts.mjs --categories 8,5,9   # 只爬取指定分类
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 输出到 public/data，Vite 会将其打包进站点
const OUTPUT_DIR = path.resolve(__dirname, '../public/data')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'prompts.json')

// 分类体系（从 youmind 分类页面提取）
const CATEGORIES = [
  // 用途 useCases
  { id: 8, title: '个人资料 / 头像', slug: 'profile-avatar', dimension: 'useCases' },
  { id: 5, title: '社交媒体帖子', slug: 'social-media-post', dimension: 'useCases' },
  { id: 9, title: '信息图 / 教育视觉图', slug: 'infographic-edu-visual', dimension: 'useCases' },
  { id: 10, title: 'YouTube 缩略图', slug: 'youtube-thumbnail', dimension: 'useCases' },
  { id: 11, title: '漫画 / 故事板', slug: 'comic-storyboard', dimension: 'useCases' },
  { id: 12, title: '产品营销', slug: 'product-marketing', dimension: 'useCases' },
  { id: 13, title: '电商主图', slug: 'ecommerce-main-image', dimension: 'useCases' },
  { id: 14, title: '游戏素材', slug: 'game-asset', dimension: 'useCases' },
  { id: 15, title: '海报 / 传单', slug: 'poster-flyer', dimension: 'useCases' },
  { id: 16, title: 'App / 网页设计', slug: 'app-web-design', dimension: 'useCases' },
  // 风格 styles
  { id: 17, title: '摄影', slug: 'photography', dimension: 'styles' },
  { id: 18, title: '电影 / 电影剧照', slug: 'cinematic-film-still', dimension: 'styles' },
  { id: 19, title: '动漫 / 漫画', slug: 'anime-manga', dimension: 'styles' },
  { id: 20, title: '插画', slug: 'illustration', dimension: 'styles' },
  { id: 21, title: '草图 / 线稿', slug: 'sketch-line-art', dimension: 'styles' },
  { id: 22, title: '漫画 / 图画小说', slug: 'comic-graphic-novel', dimension: 'styles' },
  { id: 23, title: '3D 渲染', slug: '3d-render', dimension: 'styles' },
  { id: 24, title: 'Q 版 / Q 萌风', slug: 'chibi-q-style', dimension: 'styles' },
  { id: 25, title: '等距', slug: 'isometric', dimension: 'styles' },
  { id: 26, title: '像素艺术', slug: 'pixel-art', dimension: 'styles' },
  { id: 27, title: '油画', slug: 'oil-painting', dimension: 'styles' },
  { id: 28, title: '水彩画', slug: 'watercolor', dimension: 'styles' },
  { id: 29, title: '水墨 / 中国风', slug: 'ink-chinese-style', dimension: 'styles' },
  { id: 30, title: '复古 / 怀旧', slug: 'retro-vintage', dimension: 'styles' },
  { id: 31, title: '赛博朋克 / 科幻', slug: 'cyberpunk-sci-fi', dimension: 'styles' },
  { id: 32, title: '极简主义', slug: 'minimalism', dimension: 'styles' },
  // 主体 subjects
  { id: 33, title: '人像 / 自拍', slug: 'portrait-selfie', dimension: 'subjects' },
  { id: 34, title: '网红 / 模特', slug: 'influencer-model', dimension: 'subjects' },
  { id: 35, title: '角色', slug: 'character', dimension: 'subjects' },
  { id: 36, title: '团体 / 情侣', slug: 'group-couple', dimension: 'subjects' },
  { id: 37, title: '产品', slug: 'product', dimension: 'subjects' },
  { id: 38, title: '食品 / 饮料', slug: 'food-drink', dimension: 'subjects' },
  { id: 39, title: '时尚单品', slug: 'fashion-item', dimension: 'subjects' },
  { id: 40, title: '动物 / 生物', slug: 'animal-creature', dimension: 'subjects' },
  { id: 41, title: '车辆', slug: 'vehicle', dimension: 'subjects' },
  { id: 42, title: '建筑 / 室内设计', slug: 'architecture-interior', dimension: 'subjects' },
  { id: 43, title: '风景 / 自然', slug: 'landscape-nature', dimension: 'subjects' },
  { id: 44, title: '城市风光 / 街道', slug: 'cityscape-street', dimension: 'subjects' },
  { id: 45, title: '图表', slug: 'diagram-chart', dimension: 'subjects' },
  { id: 46, title: '文本 / 排版', slug: 'text-typography', dimension: 'subjects' },
  { id: 47, title: '摘要 / 背景', slug: 'abstract-background', dimension: 'subjects' }
]

const API_URL = 'https://youmind.com/youmarketing-api/prompt-category-prompts'
const PAGE_SIZE = 18
const MAX_PAGES = 100 // 安全上限，防止无限循环

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { limit: null, categories: null }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit') opts.limit = Number(args[i + 1])
    if (args[i] === '--categories') opts.categories = args[i + 1].split(',').map(Number)
  }
  return opts
}

// 延迟函数，避免请求过快
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 调用 API 获取一页提示词
async function fetchPage(categoryId, dimension, page, locale = 'zh-CN') {
  const body = {
    media: 'image',
    dimension,
    categoryIds: categoryId ? [categoryId] : [],
    locale,
    page,
    limit: PAGE_SIZE,
    sortBy: 'time',
    sortOrder: 'desc',
    search: null
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      Referer: 'https://youmind.com/zh-CN/prompts/image/profile-avatar',
      Origin: 'https://youmind.com',
      Accept: '*/*'
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  }
  return res.json()
}

// 规范化单条提示词数据
function normalizePrompt(p, category) {
  return {
    id: p.id,
    title: p.title || '',
    description: p.description || '',
    content: p.content || '', // 英文提示词
    translatedContent: p.translatedContent || '', // 中文提示词
    slug: p.slug || '',
    author: p.author?.name || '',
    authorLink: p.author?.link || '',
    sourceLink: p.sourceLink || '',
    sourcePublishedAt: p.sourcePublishedAt || '',
    media: p.media?.[0] || '',
    mediaThumbnail: p.mediaThumbnails?.[0] || '',
    language: p.language || 'en',
    category: category ? { id: category.id, name: category.title, slug: category.slug, dimension: category.dimension } : null,
    featured: !!p.featured,
    views: p.views || 0,
    likes: p.likes || 0
  }
}

// 爬取一个分类的所有提示词
async function crawlCategory(category, opts) {
  const prompts = []
  let page = 1
  let hasMore = true
  let total = 0

  console.log(`\n📂 爬取分类: ${category.title} (id=${category.id})`)

  while (hasMore && page <= MAX_PAGES) {
    try {
      const data = await fetchPage(category.id, category.dimension, page)
      total = data.total || 0
      const items = data.prompts || []

      for (const item of items) {
        prompts.push(normalizePrompt(item, category))
        if (opts.limit && prompts.length >= opts.limit) {
          hasMore = false
          break
        }
      }

      hasMore = data.hasMore && !(opts.limit && prompts.length >= opts.limit)
      console.log(`    第 ${page} 页: 获取 ${items.length} 条, 累计 ${prompts.length}/${total}`)

      page++
      await sleep(300) // 限速，避免触发反爬
    } catch (err) {
      console.error(`    分类 ${category.name} 第 ${page} 页失败: ${err.message}`)
      // 失败重试一次
      await sleep(2000)
      try {
        const data = await fetchPage(category.id, category.dimension, page)
        const items = data.prompts || []
        for (const item of items) prompts.push(normalizePrompt(item, category))
        hasMore = data.hasMore
        page++
        await sleep(300)
      } catch (err2) {
        console.error(`    重试仍失败，跳过该页: ${err2.message}`)
        hasMore = false
      }
    }
  }

  return prompts
}

// 主函数
async function main() {
  const opts = parseArgs()
  console.log('🚀 开始爬取 GPT Image 2 提示词')
  console.log(`   分类数: ${CATEGORIES.length}, 每页: ${PAGE_SIZE}`)
  if (opts.limit) console.log(`   limit: ${opts.limit} (验证模式)`)
  if (opts.categories) console.log(`   指定分类: ${opts.categories.join(', ')}`)

  // 确定要爬取的分类
  let categories = CATEGORIES
  if (opts.categories) {
    categories = CATEGORIES.filter((c) => opts.categories.includes(c.id))
  }

  const allPrompts = []
  const seenIds = new Set()

  for (const category of categories) {
    const prompts = await crawlCategory(category, opts)
    for (const p of prompts) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id)
        allPrompts.push(p)
      }
    }
  }

  // 写入文件
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const output = {
    source: 'youmind.com',
    sourceUrl: 'https://youmind.com/zh-CN/gpt-image-2-prompts',
    crawledAt: new Date().toISOString(),
    total: allPrompts.length,
    prompts: allPrompts
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`\n✅ 爬取完成! 共 ${allPrompts.length} 条提示词`)
  console.log(`   已保存到: ${OUTPUT_FILE}`)
}

main().catch((err) => {
  console.error('爬取失败:', err)
  process.exit(1)
})