import { NextRequest, NextResponse } from 'next/server'
import { UPSTREAM_IMG_BASE } from '@/lib/img-proxy'

/**
 * GET /api/img-proxy/[...path]
 *
 * 图片代理接口:服务端从上游 CDN 拉取图片并透传给浏览器,
 * 避免浏览器直连境外域名(需翻墙),页面地址也不会暴露第三方域名。
 *
 * 示例:
 *   /api/img-proxy/media/1788245881072_bs81uo_xxx.jpg
 *   -> https://cms-assets.youmind.com/media/1788245881072_bs81uo_xxx.jpg
 */
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  const path = (params?.path ?? []).join('/')

  // 基础安全校验:上游固定为本 CDN,仅允许正常路径,禁止路径穿越
  if (!path || path.includes('..') || path.includes('//')) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  // 透传查询参数(部分图片链接带 ?x-oss-process= 等处理参数)
  const upstream = `${UPSTREAM_IMG_BASE}/${path}${request.nextUrl.search}`

  try {
    const res = await fetch(upstream, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FreeImgProxy/1.0)',
        Accept: 'image/*,*/*;q=0.8'
      },
      // 服务端缓存 24 小时,减少上游 CDN 压力
      next: { revalidate: 86400 }
    })

    if (!res.ok || !res.body) {
      return new NextResponse(`upstream ${res.status}`, { status: res.status })
    }

    const headers = new Headers()
    headers.set(
      'Content-Type',
      res.headers.get('content-type') ?? 'application/octet-stream'
    )
    headers.set(
      'Cache-Control',
      'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
    )
    const contentLength = res.headers.get('content-length')
    if (contentLength) headers.set('Content-Length', contentLength)

    return new NextResponse(res.body, { status: 200, headers })
  } catch (err) {
    console.error('图片代理失败:', err)
    return new NextResponse('Upstream Unavailable', { status: 502 })
  }
}
