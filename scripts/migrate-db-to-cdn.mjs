/**
 * 线上库图片 URL 迁移脚本:youmind 原始地址 -> jsdmirror CDN 地址
 *
 * 前置:先运行 scripts/sync-cdn-images.mjs,确保 cdn/prompts/ 里
 * 每个缩略图都有对应的 .webp 文件,否则会写出 404 的 URL。
 *
 * 安全措施:
 *  - 更新前把所有受影响行的原始 URL 备份到 data/img-url-backup-<日期>.json
 *    (data/ 已 gitignore,仅留本地);
 *  - 只更新 media_thumbnail 命中 CDN 文件的行,media 字段与缩略图统一,
 *    避免留下指向未下载原图的死链;
 *  - 分批事务写入,失败即停,重跑幂等(已是 CDN 地址的行自动跳过)。
 *
 * 用法:node --env-file=.env.local scripts/migrate-db-to-cdn.mjs [--dry-run]
 */
import { writeFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@libsql/client/web'

const DRY_RUN = process.argv.includes('--dry-run')
const CDN_BASE =
  'https://cdn.jsdmirror.com/gh/wu529778790/freeimg.shenzjd.com@main/cdn/prompts'
const BATCH_SIZE = 200

if (!process.env.TURSO_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error('缺少 TURSO_URL / TURSO_AUTH_TOKEN 环境变量,请用 --env-file=.env.local 运行')
}
const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN })

/** 缩略图 URL -> 仓库内压缩图文件名(与 sync-cdn-images.mjs 的规则一致) */
function toCdnUrl(thumbUrl) {
  const base = decodeURIComponent(new URL(thumbUrl).pathname.split('/').pop())
  const name = base.endsWith('.webp') ? base : base + '.webp'
  return `${CDN_BASE}/${name}`
}

const res = await db.execute(
  `SELECT id, media, media_thumbnail FROM prompts WHERE media_thumbnail != ''`
)
const rows = res.rows
console.log(`线上库待检查行数: ${rows.length}`)

const updates = []
const backup = []
let missingLocal = 0

for (const r of rows) {
  const media = String(r.media)
  const thumb = String(r.media_thumbnail)
  if (thumb.includes('jsdmirror.com')) continue // 已迁移,幂等跳过

  const cdnUrl = toCdnUrl(thumb)
  const localFile = path.resolve('cdn/prompts', cdnUrl.split('/').pop())
  if (!existsSync(localFile) || (await stat(localFile)).size === 0) {
    missingLocal++
    continue // 本地没有对应文件,不能写出 404 地址
  }
  updates.push({ id: Number(r.id), cdnUrl })
  backup.push({ id: Number(r.id), media, media_thumbnail: thumb })
}

console.log(`待更新 ${updates.length} 行,本地缺文件跳过 ${missingLocal} 行`)
if (missingLocal > 0) {
  // 缺文件行保留原始 URL 不动(多为上游已 404 的死链),其余正常迁移
  console.warn(`警告: ${missingLocal} 行的图片在 cdn/prompts/ 里找不到,这些行保留原 URL`)
}
if (updates.length === 0) {
  console.log('没有需要更新的行,结束')
  process.exit(0)
}

if (!DRY_RUN) {
  const backupFile = path.resolve(`data/img-url-backup-${new Date().toISOString().slice(0, 10)}.json`)
  await writeFile(backupFile, JSON.stringify(backup, null, 2))
  console.log(`原始 URL 已备份到 ${backupFile}(${backup.length} 行)`)

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE)
    const stmts = batch.map((u) => ({
      sql: 'UPDATE prompts SET media = ?, media_thumbnail = ? WHERE id = ?',
      args: [u.cdnUrl, u.cdnUrl, u.id]
    }))
    await db.batch(stmts, 'write')
    console.log(`进度: ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length}`)
  }
  console.log(`迁移完成,共更新 ${updates.length} 行`)
} else {
  console.log('[dry-run] 未写库。示例更新:')
  for (const u of updates.slice(0, 3)) console.log(`  id=${u.id} -> ${u.cdnUrl}`)
}
