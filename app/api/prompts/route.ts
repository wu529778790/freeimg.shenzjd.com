import { NextRequest, NextResponse } from 'next/server'
import { getPrompts, PAGE_SIZE_MAX } from '@/lib/prompts'
import { clientIp, logApiDone, logApiError, logApiStart } from '@/lib/api-log'
import { guardRequest } from '@/lib/bot-guard'

/**
 * GET /api/prompts?page=1&pageSize=24&dimension=useCases&category=8&search=xx
 * 提示词列表查询接口(分页 + 筛选 + 搜索),供外部工程调用
 *
 * 2026-10-26 加固:
 * - pageSize 硬上限 50(原来无上限,爬虫用 100 把缓存与内存刷满)
 * - bot-guard 拦非真人(脚本 UA / 高频翻页直接封 IP)
 * - 响应带 CDN 缓存头,重复抓取由边缘挡掉
 */

const PAGE_SIZE_DEFAULT = 24

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const startedAt = Date.now()

  const rawPageSize =
    Number(searchParams.get('pageSize')) || PAGE_SIZE_DEFAULT
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, Math.trunc(rawPageSize))
  )

  // 非真人直接封:超过上限的 pageSize 视为全量抓取特征(页面自身只用 24)
  const blocked = guardRequest(request, {
    route: 'prompts',
    bigPage: rawPageSize > PAGE_SIZE_MAX
  })
  if (blocked) return blocked

  const ip = clientIp(request)
  const query = {
    page: searchParams.get('page') || '1',
    pageSize: searchParams.get('pageSize') || String(PAGE_SIZE_DEFAULT),
    dimension: searchParams.get('dimension') || '',
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || ''
  }
  logApiStart('prompts', { ip, ...query })

  try {
    const data = await getPrompts({
      page: Number(query.page) || 1,
      pageSize,
      dimension: query.dimension || undefined,
      categoryId: query.category || undefined,
      search: query.search || undefined
    })

    logApiDone('prompts', 200, startedAt, { ip, total: data.total })
    return NextResponse.json(
      {
        success: true,
        data,
        code: 0
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600'
        }
      }
    )
  } catch (err) {
    logApiError('prompts', err, { ip, elapsed: Date.now() - startedAt })
    logApiDone('prompts', 500, startedAt, { ip, reason: '查询失败' })
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
