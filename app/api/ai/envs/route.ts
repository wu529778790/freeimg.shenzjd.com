import { NextRequest, NextResponse } from 'next/server'
import CloudBase from '@cloudbase/manager-node'

/**
 * POST /api/ai/envs  自带密钥(BYOK):凭 SecretId + SecretKey 列出可访问的云开发环境
 * body: { secretId: string, secretKey: string }
 * 返回: { success, envs: [{ envId, alias, source, status, region }] }
 *
 * 只做「列环境」这一件事:不查额度、不消耗任何调用,凭据仅本次使用、不落库不打日志。
 * 失败统一 401,避免把上游密钥相关细节透给前端。
 */
export async function POST(request: NextRequest) {
  let body: { secretId?: string; secretKey?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: '请求体不是合法 JSON' }, { status: 400 })
  }

  const secretId = (body.secretId || '').trim()
  const secretKey = (body.secretKey || '').trim()
  if (!secretId || !secretKey) {
    return NextResponse.json({ success: false, message: '请填写 SecretId 与 SecretKey' }, { status: 400 })
  }

  try {
    const manager = new CloudBase({ secretId, secretKey })
    const { EnvList = [] } = await manager.env.listEnvs()
    const envs = EnvList.map((env: { EnvId?: string; Alias?: string; Source?: string; Status?: string; Region?: string }) => ({
      envId: env.EnvId || '',
      alias: env.Alias || '',
      source: env.Source || '',
      status: env.Status || '',
      region: env.Region || ''
    }))
    return NextResponse.json({ success: true, envs })
  } catch (err) {
    console.error('列出云开发环境失败:', err instanceof Error ? err.message : err)
    // 密钥错 / 无权限 / 网络异常统一按凭据无效处理,不给上游细节
    return NextResponse.json(
      { success: false, message: 'SecretId / SecretKey 无效或无权访问云开发，请检查后重试' },
      { status: 401 }
    )
  }
}
