import { NextRequest, NextResponse } from 'next/server'
import {
  getTcbAppFor,
  generateImageOn,
  downloadImageAsDataUrl,
  passthroughTcbError,
  HY_I2I_MODEL,
  HY_FOOTNOTE,
  type TcbCredentials,
  type HunyuanImageParams
} from '@/lib/tcb'
import { clientIp, logApiDone, logApiError, logApiStart, maskSecret } from '@/lib/api-log'

/**
 * POST /api/ai/i2i  混元图生图(垫图,纯 BYOK)
 *
 * 平台不再提供免费额度;生成必须携带用户自己的云开发环境凭据 cred
 * { envId, secretId, secretKey },额度烧在用户环境的「小程序成长计划」资源包。
 *
 * body: { prompt: string, imageBase64: string, cred: TcbCredentials }
 *   imageBase64 可为裸 base64 或 data URL(服务端统一剥掉前缀)
 * 返回: { success, dataUrl }
 */

// 混元 3.0 官方上限 8192 字符,CloudBase 网关实测 8192 可过;取 4000 兼顾英文长提示词与请求体体积
const PROMPT_MAX = 4000
// 垫图限制 10MB(文档),base64 会膨胀约 1/3,按 7.5MB 原始体积限制
const IMAGE_MAX_BYTES = 7.5 * 1024 * 1024

export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  let body: { prompt?: string; imageBase64?: string; cred?: TcbCredentials }
  try {
    body = await request.json()
  } catch {
    logApiDone('i2i', 400, startedAt, { ip: clientIp(request), reason: '请求体不是合法 JSON' })
    return NextResponse.json({ success: false, message: '请求体不是合法 JSON' }, { status: 400 })
  }

  const prompt = (body.prompt || '').trim()
  let imageBase64 = (body.imageBase64 || '').trim()
  // 兼容 data URL 前缀
  const dataUrlMatch = imageBase64.match(/^data:image\/(png|jpe?g);base64,(.+)$/)
  if (dataUrlMatch) imageBase64 = dataUrlMatch[2]

  const ip = clientIp(request)
  logApiStart('i2i', {
    ip,
    promptLen: prompt.length,
    imageKB: imageBase64 ? Math.round((imageBase64.length * 3) / 4 / 1024) : 0,
    envId: body.cred?.envId || '(空)',
    secretId: maskSecret(body.cred?.secretId)
  })

  if (!prompt) {
    logApiDone('i2i', 400, startedAt, { ip, reason: '提示词为空' })
    return NextResponse.json({ success: false, message: '请先填写提示词' }, { status: 400 })
  }
  if (prompt.length > PROMPT_MAX) {
    logApiDone('i2i', 400, startedAt, { ip, reason: `提示词超长 ${prompt.length}` })
    return NextResponse.json(
      { success: false, message: `提示词最多 ${PROMPT_MAX} 字，当前 ${prompt.length} 字` },
      { status: 400 }
    )
  }
  if (!imageBase64) {
    logApiDone('i2i', 400, startedAt, { ip, reason: '缺少垫图' })
    return NextResponse.json({ success: false, message: '请先上传垫图' }, { status: 400 })
  }
  const bytes = Buffer.from(imageBase64, 'base64')
  if (bytes.length > IMAGE_MAX_BYTES) {
    logApiDone('i2i', 400, startedAt, { ip, reason: `垫图超限 ${(bytes.length / 1024 / 1024).toFixed(1)}MB` })
    return NextResponse.json(
      { success: false, message: `垫图最大 10MB，当前约 ${(bytes.length / 1024 / 1024).toFixed(1)}MB` },
      { status: 400 }
    )
  }

  // 必须携带用户自己的云开发环境凭据
  const cred = body.cred
  if (!cred?.envId || !cred?.secretId || !cred?.secretKey) {
    logApiDone('i2i', 400, startedAt, { ip, reason: '缺少云开发凭据' })
    return NextResponse.json(
      { success: false, message: '请先在上方配置你的腾讯云密钥（SecretId / SecretKey / 环境）' },
      { status: 400 }
    )
  }

  const params: HunyuanImageParams = {
    model: HY_I2I_MODEL,
    prompt,
    images: [imageBase64],
    footnote: HY_FOOTNOTE
  }

  try {
    const model = getTcbAppFor(cred).ai().createImageModel('hunyuan-image')
    const res = await generateImageOn(model, params)

    const url = res?.data?.[0]?.url
    if (!url) throw new Error('模型未返回图片 URL')

    // 签名 URL 24 小时失效,立即取回内容转 dataUrl(回取失败会自动重试,见 downloadImageAsDataUrl)
    const { dataUrl, bytes } = await downloadImageAsDataUrl(url)

    logApiDone('i2i', 200, startedAt, { ip, imageKB: Math.round(bytes / 1024) })
    return NextResponse.json({
      success: true,
      dataUrl,
      revisedPrompt: res?.data?.[0]?.revised_prompt || ''
    })
  } catch (err) {
    logApiError('i2i', err, { ip, envId: cred.envId, elapsed: Date.now() - startedAt })
    // 上游怎么返回就怎么透出:状态码、错误正文均不加工
    const { status, payload } = passthroughTcbError(err)
    // done 行补上游 requestId:422 这类上游不给正文的失败,只能靠它去云开发对账
    logApiDone('i2i', status, startedAt, { ip, reason: '上游调用失败', requestId: payload.requestId || undefined })
    return NextResponse.json(payload, { status })
  }
}
