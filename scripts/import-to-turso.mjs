/**
 * 将 public/data/prompts.json 批量导入 Turso 数据库
 *
 * 用法:
 *   node scripts/import-to-turso.mjs                # 全量导入
 *   node scripts/import-to-turso.mjs --dry-run      # 只统计不写入
 *   node scripts/import-to-turso.mjs --limit 1000   # 只导入前 1000 条
 *
 * 凭据从 .env.local 读取(TURSO_URL / TURSO_AUTH_TOKEN)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@libsql/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ---- 读取 .env.local(不引入额外依赖) ----
function loadEnv() {
  const envFile = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envFile)) {
    console.error('未找到 .env.local,请先创建(包含 TURSO_URL 和 TURSO_AUTH_TOKEN)')
    process.exit(1)
  }
  const env = {}
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

// ---- 解析命令行参数 ----
function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { dryRun: false, limit: null }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') opts.dryRun = true
    if (args[i] === '--limit') opts.limit = Number(args[i + 1])
  }
  return opts
}

// 每批插入行数(控制单条 SQL 参数数量,500 行 × 20 列 = 10000 参数,远低于 SQLite 上限)
const BATCH_SIZE = 500

const DDL = `
CREATE TABLE IF NOT EXISTS prompts (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  translated_content TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  author_link TEXT NOT NULL DEFAULT '',
  source_link TEXT NOT NULL DEFAULT '',
  source_published_at TEXT NOT NULL DEFAULT '',
  media TEXT NOT NULL DEFAULT '',
  media_thumbnail TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'en',
  category_id INTEGER,
  category_name TEXT,
  category_slug TEXT,
  category_dimension TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_prompts_dimension ON prompts(category_dimension);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category_id);
CREATE INDEX IF NOT EXISTS idx_prompts_featured ON prompts(featured);
`

// 将 JSON 条目映射为数据库行
function toRow(p) {
  return {
    id: p.id,
    title: p.title || '',
    description: p.description || '',
    content: p.content || '',
    translated_content: p.translatedContent || '',
    slug: p.slug || '',
    author: p.author || '',
    author_link: p.authorLink || '',
    source_link: p.sourceLink || '',
    source_published_at: p.sourcePublishedAt || '',
    media: p.media || '',
    media_thumbnail: p.mediaThumbnail || '',
    language: p.language || 'en',
    category_id: p.category?.id ?? null,
    category_name: p.category?.name || '',
    category_slug: p.category?.slug || '',
    category_dimension: p.category?.dimension || '',
    featured: p.featured ? 1 : 0,
    views: p.views || 0,
    likes: p.likes || 0,
    created_at: p.createdAt || ''
  }
}

async function main() {
  const opts = parseArgs()
  const env = loadEnv()

  // 读取数据
  const dataFile = path.join(ROOT, 'data/prompts.json')
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'))
  let rows = data.prompts.map(toRow)
  if (opts.limit) rows = rows.slice(0, opts.limit)
  console.log(`📄 数据文件: ${dataFile}`)
  console.log(`📊 待导入: ${rows.length} 条, 数据源爬取于 ${data.crawledAt}`)

  if (opts.dryRun) {
    console.log('--dry-run 模式,不写入数据库')
    console.log(`   示例行: ${JSON.stringify(rows[0]).slice(0, 200)}...`)
    return
  }

  // 连接 Turso
  const client = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH_TOKEN
  })

  // 建表
  console.log('🛠  创建表结构...')
  for (const sql of DDL.split(';').filter((s) => s.trim())) {
    await client.execute(sql)
  }
  console.log('✅ 表结构就绪')

  // 批量插入
  const total = rows.length
  let inserted = 0
  const t0 = Date.now()

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const placeholders = batch.map(() => `(${Array(21).fill('?').join(',')})`).join(',')
    const values = batch.flatMap((r) => [
      r.id, r.title, r.description, r.content, r.translated_content, r.slug,
      r.author, r.author_link, r.source_link, r.source_published_at,
      r.media, r.media_thumbnail, r.language,
      r.category_id, r.category_name, r.category_slug, r.category_dimension,
      r.featured, r.views, r.likes, r.created_at
    ])

    const sql = `INSERT OR REPLACE INTO prompts (id, title, description, content, translated_content, slug, author, author_link, source_link, source_published_at, media, media_thumbnail, language, category_id, category_name, category_slug, category_dimension, featured, views, likes, created_at) VALUES ${placeholders}`

    await client.execute({ sql, args: values })
    inserted += batch.length
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    console.log(`   ⏳ 已插入 ${inserted}/${total} (${elapsed}s)`)
  }

  // 验证
  const res = await client.execute('SELECT COUNT(*) AS cnt FROM prompts')
  console.log(`\n✅ 导入完成! 用时 ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  console.log(`   数据库中 prompts 表行数: ${res.rows[0].cnt}`)

  await client.close()
}

main().catch((err) => {
  console.error('❌ 导入失败:', err)
  process.exit(1)
})
