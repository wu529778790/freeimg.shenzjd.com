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
 * 生图调用包装:偶发 422/429/5xx(上游排队或审核抖动)时隔 2 秒自动重试一次
 */
export async function generateImageWithRetry(params: HunyuanImageParams): Promise<ImageGenResult> {
  const call = () => getImageModel().generateImage(params as ImageGenParams)
  try {
    return await call()
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 422 || status === 429 || (status !== undefined && status >= 500)) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      return await call()
    }
    throw err
  }
}

/**
 * 提取上游错误的具体信息(状态码 + 响应体 message),用于透传给前端诊断
 */
export function describeTcbError(err: unknown): string {
  const e = err as { response?: { status?: number; data?: unknown }; message?: string }
  const status = e?.response?.status
  let detail = ''
  const data = e?.response?.data
  if (typeof data === 'string') {
    detail = data.slice(0, 200)
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    detail = String(obj.message || obj.msg || obj.Message || JSON.stringify(data)).slice(0, 200)
  }
  const prefix = status ? `上游错误 ${status}` : ''
  const body = detail || e?.message || String(err)
  return prefix ? `${prefix}: ${body}` : body
}

/**
 * 从请求头提取客户端 IP(用于限流)
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return headers.get('x-real-ip') || 'unknown'
}
