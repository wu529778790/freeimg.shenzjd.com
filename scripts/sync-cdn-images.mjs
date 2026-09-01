/**
 * 提示词图片同步脚本(线上 Turso 库 -> 仓库 cdn/prompts/)
 *
 * 从线上库读取所有 media_thumbnail,下载原图后压缩为最长边 512px 的 webp
 * 存入 cdn/prompts/<原文件名>.webp,提交进 GitHub 后通过 jsdmirror 访问。
 * 前端卡片只展示缩略图,原图不入库(全量原图约 3.2GB,超出 git 仓库合理体积)。
 *
 * 用法:node --env-file=.env.local scripts/sync-cdn-images.mjs
 * 幂等:输出文件已存在则跳过,可反复执行补漏。
 */
import { mkdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { createClient } from '@libsql/client/web'

const DEST_DIR = path.resolve('cdn/prompts')
const MAX_EDGE = 512
const WEBP_QUALITY = 80
const CONCURRENCY = 16

if (!process.env.TURSO_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error('缺少 TURSO_URL / TURSO_AUTH_TOKEN 环境变量,请用 --env-file=.env.local 运行')
}
const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN })

/** 输出文件名:原文件名 + .webp(原文件名已含时间戳+唯一 id,不会冲突) */
function outputName(thumbUrl) {
  const base = decodeURIComponent(new URL(thumbUrl).pathname.split('/').pop())
  if (!/^[\w.-]+$/.test(base)) throw new Error(`非法文件名: ${thumbUrl}`)
  return base.endsWith('.webp') ? base : base + '.webp'
}

const res = await db.execute(`SELECT media_thumbnail FROM prompts WHERE media_thumbnail != ''`)
const urls = [...new Set(res.rows.map((r) => String(r.media_thumbnail)))]
console.log(`线上库缩略图 URL 共 ${urls.length} 个(去重后)`)

await mkdir(DEST_DIR, { recursive: true })

let downloaded = 0
let skipped = 0
const failed = []
const queue = urls.map((url) => ({ url, name: outputName(url) }))

async function processOne({ url, name }) {
  const dest = path.join(DEST_DIR, name)
  if (existsSync(dest)) {
    const s = await stat(dest)
    if (s.size > 0) {
      skipped++
      return
    }
  }
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FreeImgSync/1.0)' }
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const buf = Buffer.from(await resp.arrayBuffer())
  await sharp(buf)
    .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(dest)
  downloaded++
  if ((downloaded + skipped) % 500 === 0) {
    console.log(`进度: ${downloaded + skipped}/${urls.length}`)
  }
}

await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      try {
        await processOne(item)
      } catch (err) {
        console.error(`失败: ${item.url} -> ${err.message}`)
        failed.push(item)
      }
    }
  })
)

console.log(`完成: 压缩保存 ${downloaded},跳过 ${skipped},失败 ${failed.length}`)
if (failed.length > 0) {
  console.log('失败列表(重跑本脚本可补漏):')
  for (const f of failed) console.log(`  ${f.url}`)
  process.exit(1)
}
