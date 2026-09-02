/**
 * wx-auth 登录态校验(服务端专用)
 * 前端 wx-auth-sdk 登录成功后把签名 Token 写入页面根域 Cookie(名为 wxauth-token),
 * 同域的 /api/ai/* 请求会自动携带;这里转发给 wx-auth 后端 userinfo 接口校验,
 * 换取用户身份(openid)与管理员标记(isAdmin,由登录中心统一管理,业务方无需配置)。
 */

const WX_AUTH_API_BASE = process.env.WX_AUTH_API_BASE || 'https://wx-auth.shenzjd.com'
const COOKIE_NAME = 'wxauth-token'

export interface WxUser {
  openid: string
  type?: string
  nickname?: string | null
  headimgurl?: string | null
  /** 登录中心后台标记的管理员(业务方不配置、只读取) */
  isAdmin: boolean
}

// token → user 内存缓存,避免每次生图都打一次校验接口
const cache = new Map<string, { user: WxUser | null; expires: number }>()
const CACHE_TTL = 10 * 60 * 1000

export function getWxToken(headers: Headers): string | null {
  const cookie = headers.get('cookie') || ''
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

export async function getWxUser(headers: Headers): Promise<WxUser | null> {
  const token = getWxToken(headers)
  if (!token) return null

  const key = token.length > 64 ? token.slice(0, 64) + token.length : token
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.user

  let user: WxUser | null = null
  try {
    const resp = await fetch(
      `${WX_AUTH_API_BASE}/api/auth/userinfo?token=${encodeURIComponent(token)}`,
      { cache: 'no-store' }
    )
    const data = (await resp.json()) as {
      authenticated?: boolean
      user?: Record<string, unknown>
      error?: string
    }
    if (resp.ok && data.authenticated && data.user) {
      const u = data.user
      const openid = String(u.openid || '')
      if (openid) {
        user = {
          openid,
          type: u.type as string | undefined,
          nickname: (u.nickname as string | null) ?? null,
          headimgurl: (u.headimgurl as string | null) ?? null,
          isAdmin: u.isAdmin === true
        }
      }
    }
  } catch (err) {
    // 校验服务抖动时按未登录处理,不阻塞用户(前端会重新弹登录)
    console.error('wx-auth 校验失败:', err)
    return null
  }

  cache.set(key, { user, expires: Date.now() + CACHE_TTL })
  if (cache.size > 1000) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  return user
}
