import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '../lib/bot-guard'

/**
 * 页面侧访问守卫(只挂 /prompts)。
 *
 * ⚠ 文件位置:必须放在 src/ 下,不能放项目根。
 * 本项目同时存在 src/pages(PromptsPage.css 遗留),Next 会把 pagesDir 识别成 src/pages,
 * 从而只在 src/ 里查找 middleware —— 放根目录会被静默忽略(middleware-manifest 为空)。
 *
 * 为什么页面要单独拦:
 * /prompts 是 force-dynamic(每次请求都要查 Turso + SSR 渲染 24 张卡片),
 * 爬虫只要循环翻页就能让服务端不停地查库与渲染 —— 不像 / 和 /hunyuan 是静态预渲染。
 * 2026-10-26 的日志里那批爬虫就是冲着提示词库来的(API 侧 pageSize=100 全量翻页
 * 37812 次),所以页面与 API 两头都要拦。
 *
 * 判定逻辑与 API 侧共用 lib/bot-guard.ts:脚本 UA / 高频 / 大分页 命中即封 IP。
 * 封禁表与 API 侧是两份独立的进程内存(middleware 跑在 edge 沙箱,拿不到 Node 侧模块实例),
 * 但 UA 闸不依赖计数,脚本请求无论打页面还是 API 都会被各自封掉。
 *
 * 阈值口径:页面侧 90 次/分钟(比 API 的 40 宽),因为真人筛选、翻页会产生多次导航;
 * 浏览器预取/软导航的 RSC 请求另有 300 次/分钟的独立额度,不挤占正常请求。
 * 2026-10-26 线上用 40 次/分钟误封了 4 个真实设备(页面里几十个分类链接的预取把额度刷满)。
 *
 * 注意:edge runtime 的 process.env 是构建时内联的,BOT_GUARD_* 运行时改不会影响这里,
 * 页面守卫的阈值固定走这里的入参;API 侧的开关与通行证仍由 route handler 读取运行时 env。
 */
export function middleware(request: NextRequest) {
  const blocked = guardRequest(request, {
    route: request.nextUrl.pathname,
    ratePerMin: 90
  })
  if (blocked) return blocked
  return NextResponse.next()
}

export const config = {
  // 只拦动态渲染的提示词库页面;静态页(/, /hunyuan)与构建产物不经过中间件
  matcher: ['/prompts']
}
