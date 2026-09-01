/**
 * 统计线上库全部缩略图的精确体积(HEAD 请求,不下载内容)
 * 用法:node --env-file=.env.local scripts/measure-img-sizes.mjs
 */
import { createClient } from '@libsql/client/web'

if (!process.env.TURSO_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error('缺少 TURSO_URL / TURSO_AUTH_TOKEN 环境变量,请用 --env-file=.env.local 运行')
}
const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN })
const res = await db.execute(`SELECT media_thumbnail FROM prompts WHERE media_thumbnail != ''`)
const urls = [...new Set(res.rows.map((r) => String(r.media_thumbnail)))]
console.log(`共 ${urls.length} 个缩略图 URL`)

const sizes = []
const failed = []
const queue = [...urls]
const CONCURRENCY = 32

async function headOne(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FreeImgMeasure/1.0)' } })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const len = Number(r.headers.get('content-length') || 0)
      if (len > 0) sizes.push(len)
      return
    } catch (e) {
      if (attempt === 3) failed.push(url + ' -> ' + e.message)
      else await new Promise((s) => setTimeout(s, 500 * attempt))
    }
  }
}

await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const url = queue.shift()
      await headOne(url)
      const done = sizes.length + failed.length
      if (done % 1000 === 0) console.log(`进度: ${done}/${urls.length}`)
    }
  })
)

sizes.sort((a, b) => a - b)
const total = sizes.reduce((s, x) => s + x, 0)
const pct = (p) => Math.round(sizes[Math.floor(sizes.length * p)] / 1024)
console.log(`成功 ${sizes.length},失败 ${failed.length}`)
console.log(`总大小: ${(total / 1e9).toFixed(2)} GB,平均 ${Math.round(total / sizes.length / 1024)} KB`)
console.log(`P10=${pct(0.1)}KB P25=${pct(0.25)}KB P50=${pct(0.5)}KB P75=${pct(0.75)}KB P90=${pct(0.9)}KB P99=${pct(0.99)}KB`)
console.log(`>500KB: ${sizes.filter((s) => s > 500 * 1024).length} 个,>1MB: ${sizes.filter((s) => s > 1024 * 1024).length} 个`)
if (failed.length) console.log('失败:\n' + failed.slice(0, 10).join('\n'))
