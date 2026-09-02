import { NextResponse } from 'next/server'
import { getQuotaInfo } from '@/lib/quota'
import { getWxUser } from '@/lib/wxauth'

/**
 * GET /api/ai/quota  查询当前登录用户的生图配额(只读,不扣减)
 * - 普通用户: { isAdmin: false, dailyLimit, used, remaining }
 * - 管理员:   { isAdmin: true, packageTotal, packageUsed, packageRemaining }
 * 未登录返回 401;Turso 故障时返回 503,前端隐藏额度提示即可
 */

export async function GET(request: Request) {
  const user = await getWxUser(request.headers)
  if (!user) {
    return NextResponse.json({ success: false, needAuth: true, message: '未登录' }, { status: 401 })
  }

  try {
    const info = await getQuotaInfo(user.openid, user.isAdmin)
    return NextResponse.json({ success: true, ...info })
  } catch (err) {
    console.error('查询配额失败:', err)
    return NextResponse.json({ success: false, message: '配额服务暂不可用' }, { status: 503 })
  }
}
