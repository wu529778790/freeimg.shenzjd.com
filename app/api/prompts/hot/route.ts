import { NextRequest, NextResponse } from 'next/server'
import { getHotPrompts } from '@/lib/prompts'

/**
 * GET /api/prompts/hot?limit=8
 * 热门提示词接口(每个分类取 1 条,featured 优先)
 */
export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get('limit')) || 8

  try {
    const list = await getHotPrompts(Math.min(100, Math.max(1, limit)))
    return NextResponse.json({ success: true, data: { list }, code: 0 })
  } catch (err) {
    console.error('查询热门提示词失败:', err)
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
