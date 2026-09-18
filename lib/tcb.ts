import tcb from '@cloudbase/node-sdk'

/**
 * 腾讯云开发 CloudBase AI —— 纯 BYOK(自带密钥)调用
 * 平台不再持有自己的 TCB_* 环境实例;所有生成都走请求携带的用户凭据
 * (envId + SecretId + SecretKey),额度烧在用户自己的云开发环境(小程序成长计划资源包)。
 * 凭据由请求体经 HTTPS 传入,仅本次使用、不落库不打日志,按 envId+secretId 做 LRU 缓存。
 */

/** BYOK 凭据:用户自己的云开发环境三件套 */
export interface TcbCredentials {
  envId: string
  secretId: string
  secretKey: string
}

/**
 * 类型锚:用「真实 SDK 调用」建立强类型(仅供类型推导,运行时不会执行)。
 * 注意:不能写成 ReturnType<typeof tcb.init> —— tcb.init 有多个重载,直接取函数返回类型
 * 会命中最宽签名,导致 ai().createImageModel('hunyuan-image') 的类型退化为 unknown/{}。
 * 经函数体内字面量调用,TS 才能按参数形状命中正确重载。
 */
function byokAppAnchor() {
  return tcb.init({ env: 'env-id', secretId: 'secret-id', secretKey: 'secret-key', timeout: 120000 })
}

function byokImageModelAnchor() {
  return byokAppAnchor().ai().createImageModel('hunyuan-image')
}

type TcbApp = ReturnType<typeof byokAppAnchor>
type ImageModel = ReturnType<typeof byokImageModelAnchor>
type ImageGenParams = Parameters<ImageModel['generateImage']>[0]
type ImageGenResult = Awaited<ReturnType<ImageModel['generateImage']>>

const BYOK_APP_CACHE_MAX = 10
const byokApps = new Map<string, TcbApp>()

export function getTcbAppFor(cred: TcbCredentials): TcbApp {
  const { envId, secretId, secretKey } = cred || {}
  if (!envId || !secretId || !secretKey) {
    throw new Error('缺少环境 ID / SecretId / SecretKey')
  }
  const key = `${envId}\n${secretId}`
  const cached = byokApps.get(key)
  if (cached) {
    // 命中即刷新为最近使用
    byokApps.delete(key)
    byokApps.set(key, cached)
    return cached
  }
  if (byokApps.size >= BYOK_APP_CACHE_MAX) {
    const oldest = byokApps.keys().next().value
    if (oldest) byokApps.delete(oldest as string)
  }
  const instance = tcb.init({ env: envId, secretId, secretKey, timeout: 120000 })
  byokApps.set(key, instance as TcbApp)
  return instance as TcbApp
}

// 文生图模型(旧 hunyuan-image 已于 2026-07 下线,勿改回)
export const HY_T2I_MODEL = 'HY-Image-3.0-Plus-4090-Tob-v1.0'
// 图生图模型(垫图)
export const HY_I2I_MODEL = 'HY-Image-v3.0-I2I-ToB-v1.0.1'
// 对话模型(混元 hy3,走 cloudbase 渠道)
export const HY_CHAT_MODEL = 'hy3'

// 右下角水印文字(≤16 字符):
// 默认单个空格=无水印(实测空串会回退成"AI生成");可设 TCB_FOOTNOTE=品牌名 定制
// 注意:平台默认水印是对应 AI 生成内容标识要求,去掉后合规责任在使用方
export const HY_FOOTNOTE = process.env.TCB_FOOTNOTE ?? ' '

// 文生图支持的尺寸(实测:宽高 [512,2048] 且面积 ≤ 1024x1024)
export const HY_SIZES = ['1024x1024', '1280x720', '720x1280', '2048x512'] as const

// SDK 的 TS 类型比运行时收得窄(model 字面量/revise 布尔),这里用实际支持的宽松形态,在调用处收窄
export interface HunyuanImageParams {
  model: string
  prompt: string
  size?: string
  revise?: { value: boolean }
  images?: string[]
  footnote?: string
}

/**
 * 生图调用包装:只对限流(429)和服务端抖动(5xx)重试,422 不重试
 *
 * 退避档位按错误类型分开(依据 2026-09-14~18 线上日志校准):
 * - 429 是上游 QPM 限流,原来的 2 秒退避跨不过限流窗口(日志里 2 秒后重试仍 429,
 *   隔 7 秒手动重发即成功),因此拉长到 5s / 15s
 * - 5xx 是服务端瞬时抖动,2s / 5s 快速重试即有效
 *
 * 422 不重试:它是上游对请求本身的拒绝(多为内容审核),
 * 同样的请求重发必然再失败,只会白白多等并多消耗一次上游调用。
 *
 * 注意:状态码取 TcbError.code,不要取 err.response —— TcbError 只有
 * code / message / requestId 三个字段,err.response 恒为 undefined。
 */
const RETRY_DELAYS_429 = [5000, 15000]
const RETRY_DELAYS_5XX = [2000, 5000]

export async function generateImageOn(model: ImageModel, params: HunyuanImageParams): Promise<ImageGenResult> {
  const call = () => model.generateImage(params as ImageGenParams)
  let lastError: unknown
  // attempt 0 是首次调用,其后每轮按档位退避;两条档位长度一致,取 429 的长度做上界
  for (let attempt = 0; attempt <= RETRY_DELAYS_429.length; attempt++) {
    try {
      return await call()
    } catch (err) {
      lastError = err
      const status = Number((err as { code?: string | number })?.code)
      const delays = status === 429 ? RETRY_DELAYS_429 : status >= 500 && status <= 599 ? RETRY_DELAYS_5XX : null
      const delay: number | undefined = delays?.[attempt]
      // 不可重试的错误,或重试机会已用尽
      if (delay === undefined) throw err
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw lastError
}

/**
 * 回取生成结果图:上游给的是 24 小时失效的签名 URL,必须服务端立刻取回内容,
 * 转成 dataUrl 后再下发给浏览器。
 *
 * 这里独立重试(默认 2 次、间隔 1s):走到这一步生成已经成功、额度已经消耗,
 * 因为一次网络抖动把结果丢掉纯属浪费(2026-09-16 线上就这样丢了 9 张图)。
 * 重试仍失败则抛出带原因的 Error,交由 passthroughTcbError 兜底成 502。
 */
export async function downloadImageAsDataUrl(url: string, retries = 2): Promise<{ dataUrl: string; bytes: number }> {
  let lastReason = ''
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(url)
      if (!resp.ok) {
        lastReason = `HTTP ${resp.status}`
      } else {
        const buf = Buffer.from(await resp.arrayBuffer())
        if (buf.length > 0) {
          return { dataUrl: `data:image/png;base64,${buf.toString('base64')}`, bytes: buf.length }
        }
        lastReason = '响应体为空'
      }
    } catch (err) {
      lastReason = (err as Error)?.message || String(err)
    }
    if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`生成图回取失败(已重试 ${retries} 次):${lastReason}`)
}

/**
 * 上游错误原样透传,不做任何文案包装
 *
 * CloudBase SDK 抛出的 TcbError 只有三个字段(code / message / requestId):
 * - code 就是上游 HTTP 状态码(如 422、429),非状态码的业务错误码会兜底成 502
 * - message 是上游响应体原文,或上游响应体里的 message 字段
 * 因此直接:状态码用上游的、正文用上游的,额外补上 success/requestId 供前端判定。
 *
 * 例外:422 / 429 上游常返回空响应体,SDK 只能拼出
 * "Request failed with status code 422" 这种给用户看等于没说的话,
 * 仅在这类情况下补一句可执行的兜底文案;上游只要给了正文就一律用原文。
 */
const EMPTY_BODY_FALLBACK: Record<number, string> = {
  422: '请求被上游拒绝(422):提示词或参考图可能未通过内容审核,请调整后重试',
  429: '上游限流(429):该模型每分钟请求数已达上限,请等十几秒后再试'
}

export function passthroughTcbError(err: unknown): {
  status: number
  payload: Record<string, unknown>
} {
  const e = err as { code?: string | number; message?: string; requestId?: string }

  // TcbError.code 是字符串形式的 HTTP 状态码;不是合法状态码时按 502 兜底
  const code = Number(e?.code)
  const status = Number.isInteger(code) && code >= 400 && code <= 599 ? code : 502

  const rawMessage = e?.message || String(err)

  // 上游有时把整个错误响应体塞进 message,能解析成 JSON 就原样展开透传
  let upstream: Record<string, unknown> | null = null
  try {
    const parsed = JSON.parse(rawMessage)
    if (parsed && typeof parsed === 'object') upstream = parsed as Record<string, unknown>
  } catch {
    upstream = null
  }

  // 只做字段提取,不改写文案:优先 message,其次 OpenAI 风格的 error.message
  const pickMessage = (o: Record<string, unknown> | null): string | null => {
    if (!o) return null
    if (typeof o.message === 'string') return o.message
    const nested = o.error
    if (nested && typeof nested === 'object') {
      const m = (nested as Record<string, unknown>).message
      if (typeof m === 'string') return m
    }
    return null
  }

  const upstreamMessage = pickMessage(upstream) || rawMessage
  // SDK 拿不到响应体时会拼出通用文案,只有这种"没说原因"的情况下才兜底
  const message =
    upstreamMessage === `Request failed with status code ${status}`
      ? EMPTY_BODY_FALLBACK[status] || upstreamMessage
      : upstreamMessage

  return {
    status,
    payload: {
      ...(upstream || {}),
      success: false,
      message,
      code: upstream?.code ?? e?.code,
      requestId: upstream?.requestId ?? (e?.requestId || '')
    }
  }
}
