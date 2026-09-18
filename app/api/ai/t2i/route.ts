import { NextRequest, NextResponse } from 'next/server'
import {
  getTcbAppFor,
  generateImageOn,
  downloadImageAsDataUrl,
  passthroughTcbError,
  HY_T2I_MODEL,
  HY_SIZES,
  HY_FOOTNOTE,
  type TcbCredentials,
  type HunyuanImageParams
} from '@/lib/tcb'
import { clientIp, logApiDone, logApiError, logApiStart, maskSecret } from '@/lib/api-log'

/**
 * POST /api/ai/t2i  混元文生图(纯 BYOK)
 *
 * 平台不再提供免费额度;生成必须携带用户自己的云开发环境凭据 cred
 * { envId, secretId, secretKey },额度烧在用户环境的「小程序成长计划」资源包。
 *
 * body: { prompt: string, size: string, revise?: boolean, cred: TcbCredentials }
 * 返回: { success, dataUrl, revisedPrompt }
 */

// 混元 3.0 官方上限 8192 字符,CloudBase 网关实测 8192 可过;取 4000 兼顾英文长提示词与请求体体积
const PROMPT_MAX = 4000

export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  let body: {
    prompt?: string
    size?: string
    revise?: boolean
    cred?: TcbCredentials
  }
  try {
    body = await request.json()
  } catch {
    logApiDone('t2i', 400, startedAt, { ip: clientIp(request), reason: '请求体不是合法 JSON' })
    return NextResponse.json({ success: false, message: '请求体不是合法 JSON' }, { status: 400 })
  }

  const prompt = (body.prompt || '').trim()
  const size = body.size || '1024x1024'
  const revise = body.revise !== false
  const ip = clientIp(request)
  logApiStart('t2i', {
    ip,
    promptLen: prompt.length,
    size,
    revise,
    envId: body.cred?.envId || '(空)',
    secretId: maskSecret(body.cred?.secretId)
  })

  if (!prompt) {
    logApiDone('t2i', 400, startedAt, { ip, reason: '提示词为空' })
    return NextResponse.json({ success: false, message: '请先填写提示词' }, { status: 400 })
  }
  if (prompt.length > PROMPT_MAX) {
    logApiDone('t2i', 400, startedAt, { ip, reason: `提示词超长 ${prompt.length}` })
    return NextResponse.json(
      { success: false, message: `提示词最多 ${PROMPT_MAX} 字，当前 ${prompt.length} 字` },
      { status: 400 }
    )
  }
  if (!HY_SIZES.includes(size as (typeof HY_SIZES)[number])) {
    logApiDone('t2i', 400, startedAt, { ip, reason: `不支持的尺寸 ${size}` })
    return NextResponse.json({ success: false, message: `不支持的尺寸: ${size}` }, { status: 400 })
  }

  // 必须携带用户自己的云开发环境凭据
  const cred = body.cred
  if (!cred?.envId || !cred?.secretId || !cred?.secretKey) {
    logApiDone('t2i', 400, startedAt, { ip, reason: '缺少云开发凭据' })
    return NextResponse.json(
      { success: false, message: '请先在上方配置你的腾讯云密钥（SecretId / SecretKey / 环境）' },
      { status: 400 }
    )
  }

  const params: HunyuanImageParams = {
    model: HY_T2I_MODEL,
    prompt,
    size,
    revise: { value: revise },
    footnote: HY_FOOTNOTE
  }

  try {
    const model = getTcbAppFor(cred).ai().createImageModel('hunyuan-image')
    const res = await generateImageOn(model, params)

    const url = res?.data?.[0]?.url
    if (!url) throw new Error('模型未返回图片 URL')

    // 签名 URL 24 小时失效,立即取回内容转 dataUrl(回取失败会自动重试,见 downloadImageAsDataUrl)
    const { dataUrl, bytes } = await downloadImageAsDataUrl(url)

    logApiDone('t2i', 200, startedAt, { ip, imageKB: Math.round(bytes / 1024) })
    return NextResponse.json({
      success: true,
      dataUrl,
      revisedPrompt: res?.data?.[0]?.revised_prompt || ''
    })
  } catch (err) {
    logApiError('t2i', err, { ip, envId: cred.envId, elapsed: Date.now() - startedAt })
    // 上游怎么返回就怎么透出:状态码、错误正文均不加工
    const { status, payload } = passthroughTcbError(err)
    // done 行补上游 requestId:422 这类上游不给正文的失败,只能靠它去云开发对账
    logApiDone('t2i', status, startedAt, { ip, reason: '上游调用失败', requestId: payload.requestId || undefined })
    return NextResponse.json(payload, { status })
  }
}
