import { NextResponse } from 'next/server'
import { clientIp } from './api-log'

/**
 * 访问守卫:判定「不是真人」直接封 IP。
 *
 * 背景(2026-10-26 日志复盘):9-25~10-26 共 75644 次 /api/prompts 请求,
 * 其中 37812 次是 pageSize=100 的全量翻页(18190 条数据 = 182 页),来源高度集中在
 * 少数 IP(单 IP 9679 次),单秒峰值 12 请求。这些请求把 unstable_cache 刷到 50MB
 * 上限、并让 SSR 反复渲染百张卡片,内存与 CPU 全被白嫖。
 *
 * 判定口径(用户拍板:不是真人直接封,不做累计阈值放行):
 *  1. UA 不像真实浏览器(python/curl/axios/go/node-fetch/headless...) → 立即封
 *  2. 同 IP 60 秒内请求数超阈值(默认 40) → 立即封
 *  3. 同 IP 60 秒内大分页(pageSize>50)请求超阈值(默认 8) → 立即封
 *
 * 封禁表放进程内存(重启即清),按次数累进:1h → 24h → 7d → 30d。
 * 真浏览器 UA(含微信内置浏览器/小程序 WebView/手机浏览器)一律不受 UA 闸影响,
 * 只有频率闸可能误伤——所以阈值给得比正常浏览宽松一档。
 */

/** 关闭开关:BOT_GUARD=off 时全部放行(线上应急用) */
const GUARD_DISABLED = (process.env.BOT_GUARD || '').toLowerCase() === 'off'
/** 精确 IP 白名单,逗号分隔(自己服务器/自己的程序出口) */
const ALLOW_IPS = new Set(
  (process.env.BOT_GUARD_ALLOW_IPS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
)
/** 程序调用通行证:请求头 x-freeimg-key 命中即放行(给自家爬取/对接用) */
const ACCESS_KEY = (process.env.BOT_GUARD_KEY || '').trim()
/** 每分钟请求数阈值 */
const RATE_PER_MIN = Number(process.env.BOT_GUARD_RATE_PER_MIN) || 40
/** 每分钟大分页(pageSize>50)阈值 */
const BULK_PER_MIN = Number(process.env.BOT_GUARD_BULK_PER_MIN) || 8
/** 大分页判定线 */
const BULK_PAGE_SIZE = Number(process.env.BOT_GUARD_BULK_PAGE_SIZE) || 50

/** 封禁时长档位(毫秒):首次 1 小时,再犯逐级加长 */
const BAN_LEVELS = [60 * 60 * 1000, 24 * 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000, 30 * 24 * 60 * 60 * 1000]

const WINDOW_MS = 60 * 1000
/** 频率表最多跟踪的 IP 数,超出先淘汰最早过期的(防表本身涨内存) */
const MAX_TRACKED = 5000

interface BanEntry {
  /** 封禁到期时间戳 */
  until: number
  /** 已封次数(决定下一档时长) */
  level: number
  reason: string
  /** 首次封禁时间,仅用于日志 */
  at: number
}

interface HitEntry {
  /** 窗口内的请求时间戳 */
  times: number[]
  /** 窗口内大分页请求时间戳 */
  bulk: number[]
}

const bans = new Map<string, BanEntry>()
const hits = new Map<string, HitEntry>()

/** 真实浏览器的 UA 一定是 Mozilla/5.0 (平台...) 形态;脚本类全都不满足 */
const BROWSER_UA_RE = /^Mozilla\/5\.0\s*\([^)]*(?:Windows NT|Macintosh|Mac OS X|X11|Linux|Android|iPhone|iPad|iPod|CPU OS|CPU iPhone|CrOS)[^)]*\)/
/** 伪装成浏览器的自动化工具(UA 里会留痕) */
const AUTOMATION_RE = /HeadlessChrome|PhantomJS|Puppeteer|Playwright|Selenium|webdriver/i

/** IPv6 按 /64 归并(同一台机器的临时地址会变),IPv4 原样 */
export function normalizeIp(ip: string): string {
  if (!ip) return '(未知)'
  const clean = ip.replace(/^::ffff:/i, '').trim()
  if (!clean.includes(':')) return clean
  const parts = clean.split(':')
  // 展开形如 2409:8a4c:a452:f040:5dad:4aa0:79a7:ab87 → 取前 4 段
  const head = parts.slice(0, 4).filter(Boolean)
  if (head.length < 4) return clean
  return `${head.join(':')}::/64`
}

function looksLikeBrowser(ua: string): boolean {
  if (!ua) return false
  if (!BROWSER_UA_RE.test(ua)) return false
  if (AUTOMATION_RE.test(ua)) return false
  return true
}

/** UA 摘要写日志用(去掉可能包含的敏感串,截断即可) */
function uaBrief(ua: string): string {
  if (!ua) return '(空)'
  return ua.length > 60 ? `${ua.slice(0, 60)}…` : ua
}

/** 同一 IP 的同一原因 10 分钟最多打一条日志,防被封者刷爆日志 */
const lastLogAt = new Map<string, number>()
function logBlocked(ip: string, reason: string, meta: string): void {
  const key = `${ip}|${reason}`
  const now = Date.now()
  const prev = lastLogAt.get(key) || 0
  if (now - prev < 10 * 60 * 1000) return
  lastLogAt.set(key, now)
  if (lastLogAt.size > 2000) lastLogAt.clear()
  console.warn(`[${new Date().toISOString()}] ⛔ bot-guard ip=${ip} reason=${reason} ${meta}`)
}

/** 写入封禁(累进档位) */
function ban(ip: string, reason: string, meta: string): void {
  const prev = bans.get(ip)
  const level = Math.min((prev?.level || 0), BAN_LEVELS.length - 1)
  const duration = BAN_LEVELS[level]
  bans.set(ip, { until: Date.now() + duration, level: Math.min(level + 1, BAN_LEVELS.length), reason, at: prev?.at || Date.now() })
  logBlocked(ip, reason, `duration=${Math.round(duration / 60000)}min level=${level + 1} ${meta}`)
}

/** 惰性清理:频率表超过上限时,把窗口外的条目删掉;封禁表顺带清过期项 */
function pruneHits(now: number): void {
  if (bans.size > MAX_TRACKED) {
    for (const [key, entry] of bans) {
      if (entry.until <= now) bans.delete(key)
    }
  }
  if (hits.size <= MAX_TRACKED) return
  for (const [key, entry] of hits) {
    const last = entry.times[entry.times.length - 1] || 0
    if (now - last > WINDOW_MS) hits.delete(key)
    if (hits.size <= MAX_TRACKED) break
  }
}

/**
 * 计数并按需封禁;返回 true 表示本次请求应被封。
 * @param bigPage 本次请求是否属于大分页(POST 接口传 false)
 */
function tally(ip: string, bigPage: boolean, now: number, meta: string): boolean {
  pruneHits(now)
  let entry = hits.get(ip)
  if (!entry) {
    entry = { times: [], bulk: [] }
    hits.set(ip, entry)
  }
  // 丢弃窗口外的时间戳
  entry.times = entry.times.filter((t) => now - t < WINDOW_MS)
  entry.bulk = entry.bulk.filter((t) => now - t < WINDOW_MS)
  entry.times.push(now)
  if (bigPage) entry.bulk.push(now)

  if (entry.times.length > RATE_PER_MIN) {
    ban(ip, 'rate', `count=${entry.times.length}/${RATE_PER_MIN}perMin ${meta}`)
    return true
  }
  if (bigPage && entry.bulk.length > BULK_PER_MIN) {
    ban(ip, 'bulk_paging', `bulk=${entry.bulk.length}/${BULK_PER_MIN}perMin pageSize>${BULK_PAGE_SIZE} ${meta}`)
    return true
  }
  return false
}

/** 拦截响应:403 + Retry-After,不透露判定细节 */
function blockResponse(until: number, ip: string): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((until - Date.now()) / 1000))
  return NextResponse.json(
    { success: false, code: 403, message: '访问被拒绝' },
    {
      status: 403,
      headers: {
        'Retry-After': String(retryAfter),
        'Cache-Control': 'no-store',
        'X-Blocked-By': `bot-guard:${ip}`
      }
    }
  )
}

export interface GuardOptions {
  /** 路由名,仅用于日志 */
  route: string
  /** 本次请求是否属于大分页(只有 /api/prompts 传 pageSize>50) */
  bigPage?: boolean
}

/**
 * 守卫入口。放行返回 null,拦截返回 403 响应(调用方直接 return)。
 *
 * 用法:
 *   const blocked = guardRequest(request, { route: 'prompts', bigPage })
 *   if (blocked) return blocked
 */
export function guardRequest(request: Request, opts: GuardOptions): NextResponse | null {
  if (GUARD_DISABLED) return null

  const rawIp = clientIp(request)
  const ip = normalizeIp(rawIp)

  // 自家程序通行证
  if (ACCESS_KEY && (request.headers.get('x-freeimg-key') || '').trim() === ACCESS_KEY) return null
  if (ALLOW_IPS.has(rawIp) || ALLOW_IPS.has(ip)) return null

  const now = Date.now()
  const ua = request.headers.get('user-agent') || ''
  const meta = `route=${opts.route} ua="${uaBrief(ua)}"`

  // 已封禁直接拒
  const existing = bans.get(ip)
  if (existing) {
    if (existing.until > now) {
      logBlocked(ip, 'banned', `until=${new Date(existing.until).toISOString()} ${meta}`)
      return blockResponse(existing.until, ip)
    }
    bans.delete(ip)
  }

  // 闸一:UA 不像真实浏览器(空 UA / 脚本 UA / 自动化工具)
  if (!looksLikeBrowser(ua)) {
    ban(ip, 'not_browser', meta)
    return blockResponse(bans.get(ip)!.until, ip)
  }

  // 闸二/三:频率与大分页频次
  if (tally(ip, Boolean(opts.bigPage), now, meta)) {
    return blockResponse(bans.get(ip)!.until, ip)
  }

  return null
}

/** 观测用:当前封禁数量(给健康检查/日志用) */
export function guardStats(): { banned: number; tracked: number } {
  return { banned: bans.size, tracked: hits.size }
}
