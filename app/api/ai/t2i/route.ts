import { NextRequest, NextResponse } from 'next/server'
import {
  getTcbAppFor,
  generateImageOn,
  generateImageWithRetry,
  passthroughTcbError,
  HY_T2I_MODEL,
  HY_SIZES,
  HY_FOOTNOTE,
  type TcbCredentials,
  type HunyuanImageParams
} from '@/lib/tcb'
import { consumeUserQuota } from '@/lib/quota'
import { getWxUser } from '@/lib/wxauth'

/**
 * POST /api/ai/t2i  混元文生图
 *
 * 两种模式:
 * 1) 平台模式(默认):不带 cred,需微信登录,消耗平台生图额度(每人每日限免 + 全局兜底)
 * 2) BYOK 模式:body 携带 cred { envId, secretId, secretKey },免登录免配额,
 *    额度烧在用户自己的云开发环境(小程序成长计划资源包)
 *
 * body: { prompt: string, size: string, revise?: boolean, cred?: TcbCredentials }
 * 返回: { success, dataUrl, revisedPrompt, remaining }
 */

// 混元 3.0 官方上限 8192 字符,CloudBase 网关实测 8192 可过;取 4000 兼顾英文长提示词与请求体体积
const PROMPT_MAX = 4000

export async function POST(request: NextRequest) {
  let body: {
    prompt?: string
    size?: string
    revise?: boolean
    cred?: TcbCredentials
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: '请求体不是合法 JSON' }, { status: 400 })
  }

  const prompt = (body.prompt || '').trim()
  const size = body.size || '1024x1024'
  const revise = body.revise !== false

  if (!prompt) {
    return NextResponse.json({ success: false, message: '请先填写提示词' }, { status: 400 })
  }
  if (prompt.length > PROMPT_MAX) {
    return NextResponse.json(
      { success: false, message: `提示词最多 ${PROMPT_MAX} 字，当前 ${prompt.length} 字` },
      { status: 400 }
    )
  }
  if (!HY_SIZES.includes(size as (typeof HY_SIZES)[number])) {
    return NextResponse.json({ success: false, message: `不支持的尺寸: ${size}` }, { status: 400 })
  }

  const params: HunyuanImageParams = {
    model: HY_T2I_MODEL,
    prompt,
    size,
    revise: { value: revise },
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

    // 签名 URL 24 小时失效,立即取回图片内容转 dataUrl 下发给浏览器
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
    console.error('混元生图失败:', err)
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
    console.error('混元生图失败(BYOK):', err)
    const { status, payload } = passthroughTcbError(err)
    return NextResponse.json(payload, { status })
  }
}
