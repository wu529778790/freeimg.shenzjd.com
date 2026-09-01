import { NextRequest, NextResponse } from 'next/server'
import { getPrompts } from '@/lib/prompts'

/**
 * GET /api/prompts?page=1&pageSize=24&dimension=useCases&category=8&search=xx
 * 提示词列表查询接口(分页 + 筛选 + 搜索),供外部工程调用
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  try {
    const data = await getPrompts({
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      pageSize: searchParams.get('pageSize')
        ? Number(searchParams.get('pageSize'))
        : 24,
      dimension: searchParams.get('dimension') || undefined,
      categoryId: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined
    })

    return NextResponse.json({
      success: true,
      data,
      code: 0
    })
  } catch (err) {
    console.error('查询提示词失败:', err)
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
