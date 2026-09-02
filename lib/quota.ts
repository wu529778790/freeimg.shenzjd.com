import { getDb } from './turso'

/**
 * 基于 Turso 的生图配额(登录用户维度,表 ai_quota 首次调用时自动建表):
 * - 每 用户/天 上限(TCB_USER_DAILY_IMAGE_LIMIT,默认 10)
 * - 全局每日上限兜底,防总量失控烧光资源包(TCB_GLOBAL_DAILY_IMAGE_LIMIT,默认 500)
 * - 管理员(TCB_ADMIN_OPENIDS)不做任何限制
 * 资源包总量:小程序成长计划二期为 10 万张(2026 年内有效),按 180 天均摊约 550 张/天
 */

export const USER_DAILY_IMAGE_LIMIT = Number(process.env.TCB_USER_DAILY_IMAGE_LIMIT || 10)
export const GLOBAL_DAILY_IMAGE_LIMIT = Number(
  process.env.TCB_GLOBAL_DAILY_IMAGE_LIMIT || 500
)
// 小程序成长计划二期资源包总量(2026 年内有效),仅用于管理员侧总量展示
export const PACKAGE_TOTAL_IMAGES = Number(process.env.TCB_PACKAGE_TOTAL_IMAGES || 100000)

export interface QuotaResult {
  ok: boolean
  // -1 表示不限量(管理员)
  remaining: number
  limit: number
  // 命中的是用户限额还是全局限额
  scope: 'user' | 'global'
}

async function consume(
  key: string,
  day: string,
  cost: number,
  limit: number
): Promise<{ ok: boolean; remaining: number }> {
  const db = getDb()
  const { rows } = await db.execute({
    sql: 'SELECT used FROM ai_quota WHERE ip = ? AND day = ?',
    args: [key, day]
  })
  const used = Number(rows[0]?.used || 0)
  if (used + cost > limit) {
    return { ok: false, remaining: Math.max(0, limit - used) }
  }
  await db.execute({
    sql: `INSERT INTO ai_quota (ip, day, used) VALUES (?, ?, ?)
          ON CONFLICT (ip, day) DO UPDATE SET used = used + ?`,
    args: [key, day, cost, cost]
  })
  return { ok: true, remaining: limit - used - cost }
}

/**
 * 按登录用户扣减生图额度;isAdmin 时不限不记
 */
export async function consumeUserQuota(
  openid: string,
  isAdmin: boolean,
  cost = 1
): Promise<QuotaResult> {
  if (isAdmin) {
    return { ok: true, remaining: -1, limit: -1, scope: 'user' }
  }

  const db = getDb()
  const day = new Date().toISOString().slice(0, 10)

  await db.execute(
    'CREATE TABLE IF NOT EXISTS ai_quota (ip TEXT NOT NULL, day TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (ip, day))'
  )

  // 先扣全局池,再扣个人额度(个人超额时全局已扣的 1 次属于保守多计,可接受)
  const globalRow = await consume('__global__', day, cost, GLOBAL_DAILY_IMAGE_LIMIT)
  if (!globalRow.ok) {
    return { ok: false, remaining: 0, limit: GLOBAL_DAILY_IMAGE_LIMIT, scope: 'global' }
  }

  const userRow = await consume(`user:${openid}`, day, cost, USER_DAILY_IMAGE_LIMIT)
  if (!userRow.ok) {
    return { ok: false, remaining: 0, limit: USER_DAILY_IMAGE_LIMIT, scope: 'user' }
  }

  return { ok: true, remaining: userRow.remaining, limit: USER_DAILY_IMAGE_LIMIT, scope: 'user' }
}

export interface QuotaInfo {
  isAdmin: boolean
  // 普通用户:今日个人额度
  dailyLimit: number
  used: number
  remaining: number
  // 管理员:资源包总量(普通用户为 -1)
  packageTotal: number
  packageUsed: number
  packageRemaining: number
}

/**
 * 只读查询配额(不扣减):普通用户看今日剩余,管理员看资源包总量剩余。
 * 资源包已用 = ai_quota 表全部用户行(不含 __global__ 兜底行)的历史累计。
 */
export async function getQuotaInfo(
  openid: string,
  isAdmin: boolean
): Promise<QuotaInfo> {
  const db = getDb()
  const day = new Date().toISOString().slice(0, 10)

  await db.execute(
    'CREATE TABLE IF NOT EXISTS ai_quota (ip TEXT NOT NULL, day TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (ip, day))'
  )

  if (isAdmin) {
    const { rows } = await db.execute(
      "SELECT COALESCE(SUM(used), 0) AS total FROM ai_quota WHERE ip != '__global__'"
    )
    const packageUsed = Number(rows[0]?.total || 0)
    return {
      isAdmin: true,
      dailyLimit: -1,
      used: 0,
      remaining: -1,
      packageTotal: PACKAGE_TOTAL_IMAGES,
      packageUsed,
      packageRemaining: Math.max(0, PACKAGE_TOTAL_IMAGES - packageUsed)
    }
  }

  const { rows } = await db.execute({
    sql: 'SELECT used FROM ai_quota WHERE ip = ? AND day = ?',
    args: [`user:${openid}`, day]
  })
  const used = Number(rows[0]?.used || 0)
  return {
    isAdmin: false,
    dailyLimit: USER_DAILY_IMAGE_LIMIT,
    used,
    remaining: Math.max(0, USER_DAILY_IMAGE_LIMIT - used),
    packageTotal: -1,
    packageUsed: -1,
    packageRemaining: -1
  }
}
