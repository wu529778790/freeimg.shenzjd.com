import { NextRequest, NextResponse } from 'next/server'
import {
  getTcbAppFor,
  generateImageOn,
  generateImageWithRetry,
  passthroughTcbError,
  HY_I2I_MODEL,
  HY_FOOTNOTE,
  type TcbCredentials,
  type HunyuanImageParams
} from '@/lib/tcb'
import { consumeUserQuota } from '@/lib/quota'
import { getWxUser } from '@/lib/wxauth'

/**
 * POST /api/ai/i2i  混元图生图(垫图)
 *
 * 两种模式:
 * 1) 平台模式(默认):不带 cred,需微信登录,消耗平台生图额度
 * 2) BYOK 模式:body 携带 cred { envId, secretId, secretKey },免登录免配额,
 *    额度烧在用户自己的云开发环境
 *
 * body: { prompt: string, imageBase64: string, cred?: TcbCredentials }
 *   imageBase64 可为裸 base64 或 data URL(服务端统一剥掉前缀)
 * 返回: { success, dataUrl, remaining }
 */

// 混元 3.0 官方上限 8192 字符,CloudBase 网关实测 8192 可过;取 4000 兼顾英文长提示词与请求体体积
const PROMPT_MAX = 4000
// 垫图限制 10MB(文档),base64 会膨胀约 1/3,按 7.5MB 原始体积限制
const IMAGE_MAX_BYTES = 7.5 * 1024 * 1024

export async function POST(request: NextRequest) {
  let body: { prompt?: string; imageBase64?: string; cred?: TcbCredentials }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: '请求体不是合法 JSON' }, { status: 400 })
  }

  const prompt = (body.prompt || '').trim()
  let imageBase64 = (body.imageBase64 || '').trim()
  // 兼容 data URL 前缀
  const dataUrlMatch = imageBase64.match(/^data:image\/(png|jpe?g);base64,(.+)$/)
  if (dataUrlMatch) imageBase64 = dataUrlMatch[2]

  if (!prompt) {
    return NextResponse.json({ success: false, message: '请先填写提示词' }, { status: 400 })
  }
  if (prompt.length > PROMPT_MAX) {
    return NextResponse.json(
      { success: false, message: `提示词最多 ${PROMPT_MAX} 字，当前 ${prompt.length} 字` },
      { status: 400 }
    )
  }
  if (!imageBase64) {
    return NextResponse.json({ success: false, message: '请先上传垫图' }, { status: 400 })
  }
  const bytes = Buffer.from(imageBase64, 'base64')
  if (bytes.length > IMAGE_MAX_BYTES) {
    return NextResponse.json(
      { success: false, message: `垫图最大 10MB，当前约 ${(bytes.length / 1024 / 1024).toFixed(1)}MB` },
      { status: 400 }
    )
  }

  const params: HunyuanImageParams = {
    model: HY_I2I_MODEL,
    prompt,
    images: [imageBase64],
    footnote: HY_FOOTNOTE
  }

  // ---- BYOK 模式:用户自带云开发环境,额度烧在用户侧,免登录免配额 ----
  const cred = body.cred
  if (cred?.envId && cred?.secretId && cred?.secretKey) {
    return generateWithImage(cred, params)
  }

  // ---- 平台模式:微信登录 + 平台配额 ----
  const user = await getWxUser(request.headers)
  if (!user) {
    return NextResponse.json(
      { success: false, needAuth: true, message: '请先使用微信扫码登录后生成' },
      { status: 401 }
    )
  }
  const admin = user.isAdmin

  // 配额:普通用户每日限免,管理员不限;Turso 故障时放行,避免数据库故障导致整体不可用
  let quota: Awaited<ReturnType<typeof consumeUserQuota>> | null = null
  try {
    quota = await consumeUserQuota(user.openid, admin, 1)
    if (!quota.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            quota.scope === 'global'
              ? '今日平台免费额度已放完，明天再来吧'
              : `今日免费额度已用完（每人每天 ${quota.limit} 张），明天再来吧`,
          remaining: 0
        },
        { status: 429 }
      )
    }
  } catch (err) {
    console.error('配额服务异常,本次放行:', err)
  }

  try {
    const res = await generateImageWithRetry(params)

    const url = res?.data?.[0]?.url
    if (!url) throw new Error('模型未返回图片 URL')

    const imgResp = await fetch(url)
    if (!imgResp.ok) throw new Error(`图片下载失败: ${imgResp.status}`)
    const buf = Buffer.from(await imgResp.arrayBuffer())
    const dataUrl = `data:image/png;base64,${buf.toString('base64')}`

    return NextResponse.json({
      success: true,
      dataUrl,
      revisedPrompt: res?.data?.[0]?.revised_prompt || '',
      remaining: quota ? quota.remaining : -1
    })
  } catch (err) {
    console.error('混元图生图失败:', err)
    // 上游怎么返回就怎么透出:状态码、错误正文均不加工
    const { status, payload } = passthroughTcbError(err)
    return NextResponse.json(payload, { status })
  }
}

/** BYOK 生图:用用户凭据 init 实例生成,错误同平台模式原样透传 */
async function generateWithImage(
  cred: TcbCredentials,
  params: HunyuanImageParams
): Promise<NextResponse> {
  try {
    const model = getTcbAppFor(cred).ai().createImageModel('hunyuan-image')
    const res = await generateImageOn(model, params)

    const url = res?.data?.[0]?.url
    if (!url) throw new Error('模型未返回图片 URL')

    const imgResp = await fetch(url)
    if (!imgResp.ok) throw new Error(`图片下载失败: ${imgResp.status}`)
    const buf = Buffer.from(await imgResp.arrayBuffer())
    const dataUrl = `data:image/png;base64,${buf.toString('base64')}`

    return NextResponse.json({
      success: true,
      dataUrl,
      revisedPrompt: res?.data?.[0]?.revised_prompt || '',
      remaining: -1,
      byok: true
    })
  } catch (err) {
    console.error('混元图生图失败(BYOK):', err)
    const { status, payload } = passthroughTcbError(err)
    return NextResponse.json(payload, { status })
  }
}
