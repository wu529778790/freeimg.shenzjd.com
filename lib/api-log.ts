/**
 * 服务端 API 请求日志:统一前缀与字段格式,便于在 Docker/PM2 日志里检索排查。
 *
 * 约定:
 * - 每个请求打两条:start(▶,进业务前)与 done(■,返回前,含耗时与状态码);异常另打 error(✖)。
 * - 严禁把 secretKey、图片 base64、提示词正文写进日志;凭据一律走 maskSecret 脱敏。
 */

function timestamp(): string {
  return new Date().toISOString()
}

/** meta 拼成 k=v 串;字符串原样,其余 JSON 化(数组/对象会被截断到 200 字符防刷屏) */
function fmt(meta: Record<string, unknown>): string {
  return Object.entries(meta)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      if (typeof v === 'string') return `${k}=${v}`
      let s = JSON.stringify(v)
      if (s && s.length > 200) s = s.slice(0, 200) + '…'
      return `${k}=${s}`
    })
    .join(' ')
}

/** 凭据脱敏:只留前 6 位用于对账,其余打码;空值显式标注 */
export function maskSecret(id?: string): string {
  if (!id) return '(空)'
  return id.length <= 6 ? '***' : `${id.slice(0, 6)}***`
}

/**
 * 提取客户端 IP。
 *
 * 可信顺序(2026-10-26 加):腾讯 EdgeOne 回源时会注入 EO-Connecting-IP 并覆盖客户端自带的同名头,
 * 这层客户端伪造不了,优先用;其次用 X-Forwarded-For 第一段(EdgeOne 默认按客户端 IP 重写,
 * 线上日志实测该值就是真实用户 IP,且分布合理)。
 *
 * 注意:不要优先用 x-real-ip —— 它是 nginx 的 $remote_addr,在 CDN 回源场景下是 EdgeOne
 * 节点 IP,同一节点下的所有用户会共用一个地址,拿它做封禁会连坐整批真人。
 */
export function clientIp(request: Request): string {
  const eo = request.headers.get('eo-connecting-ip')
  if (eo && eo.trim()) return eo.trim()
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip') || '(未知)'
}

export function logApiStart(route: string, meta: Record<string, unknown> = {}): void {
  console.log(`[${timestamp()}] ▶ ${route} ${fmt(meta)}`)
}

export function logApiDone(
  route: string,
  status: number,
  startedAt: number,
  meta: Record<string, unknown> = {}
): void {
  console.log(`[${timestamp()}] ■ ${route} status=${status} 耗时=${Date.now() - startedAt}ms ${fmt(meta)}`)
}

export function logApiError(route: string, err: unknown, meta: Record<string, unknown> = {}): void {
  console.error(`[${timestamp()}] ✖ ${route} ${fmt(meta)}`, err)
}
