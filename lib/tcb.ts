import tcb from '@cloudbase/node-sdk'

/**
 * 腾讯云开发 CloudBase AI 服务端单例
 * 凭据从环境变量读取:TCB_ENV_ID / TCB_SECRET_ID / TCB_SECRET_KEY
 * 密钥只能存在于服务端,绝不能暴露到浏览器
 */
let app: ReturnType<typeof tcb.init> | null = null

export function getTcbApp() {
  if (!app) {
    const env = process.env.TCB_ENV_ID
    const secretId = process.env.TCB_SECRET_ID
    const secretKey = process.env.TCB_SECRET_KEY
    if (!env || !secretId || !secretKey) {
      throw new Error('缺少 TCB_ENV_ID / TCB_SECRET_ID / TCB_SECRET_KEY 环境变量')
    }
    app = tcb.init({ env, secretId, secretKey, timeout: 120000 })
  }
  return app
}

// 文生图模型(旧 hunyuan-image 已于 2026-07 下线,勿改回)
export const HY_T2I_MODEL = 'HY-Image-3.0-Plus-4090-Tob-v1.0'
// 图生图模型(垫图)
export const HY_I2I_MODEL = 'HY-Image-v3.0-I2I-ToB-v1.0.1'
// 对话模型(混元 hy3,走 cloudbase 渠道)
export const HY_CHAT_MODEL = 'hy3'

// 文生图支持的尺寸(实测:宽高 [512,2048] 且面积 ≤ 1024x1024)
export const HY_SIZES = ['1024x1024', '1280x720', '720x1280', '2048x512'] as const

export function getImageModel() {
  return getTcbApp().ai().createImageModel('hunyuan-image')
}

export function getChatModel() {
  return getTcbApp().ai().createModel('cloudbase')
}

// SDK 的 TS 类型比运行时收得窄(model 字面量/revise 布尔),这里用实际支持的宽松形态,在调用处收窄
export interface HunyuanImageParams {
  model: string
  prompt: string
  size?: string
  revise?: { value: boolean }
  images?: string[]
  footnote?: string
}

// 右下角水印文字(≤16 字符):
// 默认单个空格=无水印(实测空串会回退成"AI生成");可设 TCB_FOOTNOTE=品牌名 定制
// 注意:平台默认水印是对应 AI 生成内容标识要求,去掉后合规责任在使用方
export const HY_FOOTNOTE = process.env.TCB_FOOTNOTE ?? ' '

type ImageGenParams = Parameters<ReturnType<typeof getImageModel>['generateImage']>[0]
type ImageGenResult = Awaited<ReturnType<ReturnType<typeof getImageModel>['generateImage']>>

/**
 * 生图调用包装:只对限流(429)和服务端抖动(5xx)隔 2 秒重试一次
 *
 * 422 不重试:它是上游对请求本身的拒绝(多为提示词触发内容审核),
 * 同样的请求重发必然再失败,只会白白多等 2 秒并多消耗一次上游调用。
 *
 * 注意:状态码取 TcbError.code,不要取 err.response —— TcbError 只有
 * code / message / requestId 三个字段,err.response 恒为 undefined。
 */
export async function generateImageWithRetry(params: HunyuanImageParams): Promise<ImageGenResult> {
  const call = () => getImageModel().generateImage(params as ImageGenParams)
  try {
    return await call()
  } catch (err) {
    const status = Number((err as { code?: string | number })?.code)
    if (status === 429 || (status >= 500 && status <= 599)) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      return await call()
    }
    throw err
  }
}

/**
 * 上游错误原样透传,不做任何文案包装
 *
 * CloudBase SDK 抛出的 TcbError 只有三个字段(code / message / requestId):
 * - code 就是上游 HTTP 状态码(如 422、429),非状态码的业务错误码会兜底成 502
 * - message 是上游响应体原文,或上游响应体里的 message 字段
 * 因此直接:状态码用上游的、正文用上游的,额外补上 success/requestId 供前端判定。
 */
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

  return {
    status,
    payload: {
      ...(upstream || {}),
      success: false,
      message: pickMessage(upstream) || rawMessage,
      code: upstream?.code ?? e?.code,
      requestId: upstream?.requestId ?? (e?.requestId || '')
    }
  }
}

/**
 * 从请求头提取客户端 IP(用于限流)
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return headers.get('x-real-ip') || 'unknown'
}
