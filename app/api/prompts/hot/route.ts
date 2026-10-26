import { NextRequest, NextResponse } from 'next/server'
import { getHotPrompts } from '@/lib/prompts'
import { clientIp, logApiDone, logApiError, logApiStart } from '@/lib/api-log'
import { guardRequest } from '@/lib/bot-guard'

/**
 * GET /api/prompts/hot?limit=8
 * 热门提示词接口(每个分类取 1 条,featured 优先)
 */
export async function GET(request: NextRequest) {
  const startedAt = Date.now()
  const limit = Number(request.nextUrl.searchParams.get('limit')) || 8

  const blocked = guardRequest(request, { route: 'prompts/hot' })
  if (blocked) return blocked

  const ip = clientIp(request)
  logApiStart('prompts/hot', { ip, limit })

  try {
    const list = await getHotPrompts(Math.min(100, Math.max(1, limit)))
    logApiDone('prompts/hot', 200, startedAt, { ip, count: list.length })
    return NextResponse.json({ success: true, data: { list }, code: 0 })
  } catch (err) {
    logApiError('prompts/hot', err, { ip, elapsed: Date.now() - startedAt })
    logApiDone('prompts/hot', 500, startedAt, { ip, reason: '查询失败' })
    return NextResponse.json(
      {
        success: false,
        code: 500,
        message: err instanceof Error ? err.message : '服务器内部错误'
      },
      { status: 500 }
    )
  }
}
