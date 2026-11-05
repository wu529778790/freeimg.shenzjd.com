/**
 * Next.js instrumentation 钩子:server 启动时执行一次
 * (需 next.config.mjs 的 experimental.instrumentationHook,Next 14 仍是实验特性)。
 *
 * ⚠ 文件位置:必须放在 src/ 下,与 src/middleware.ts 同一个坑 ——
 * 本项目同时存在 src/pages,Next 取 pagesDir(= src/pages)的上级当根目录,
 * 只会在 src/ 里查找 instrumentation,放项目根会被静默忽略。
 *
 * 在这里压掉 Next 内部的「Server Action 不存在」报错刷屏:部署更新后,
 * 旧页面缓存/异常探测会带着已失效的 Next-Action 头发 POST。本项目没有
 * server actions,编译运行时(app-page.runtime)对这类请求走的是
 * `console.warn(r$(actionId))` 分支(site 没有 actions 时 errorLogger /
 * __next_log_error__ / console.error 都轮不到),所以 warn 与 error 一起过滤。
 * 2026-11-04 日志里全天 8 组、每组 5 条(1 条报错 + 10 行堆栈)。这类请求
 * 对用户无感(Next 回 404),压成每 10 分钟最多一条计数即可。
 */
export async function register() {
  // register 在 nodejs / edge 两个运行时各调一次(各有一份 console),只补一次丁
  const g = globalThis as { __serverActionErrPatched?: boolean }
  if (g.__serverActionErrPatched) return
  g.__serverActionErrPatched = true

  const MARKER = 'Failed to find Server Action'
  const origError = console.error.bind(console)
  const origWarn = console.warn.bind(console)
  let suppressed = 0
  let lastNoticeAt = 0

  /** 命中标记的调用吞掉;非命中原样透传 */
  const filtered = (orig: (...args: unknown[]) => void, ...args: unknown[]): void => {
    const hit = args.some((a) => {
      const text = a instanceof Error ? a.message : typeof a === 'string' ? a : ''
      return text.includes(MARKER)
    })
    if (!hit) {
      orig(...args)
      return
    }
    suppressed++
    const now = Date.now()
    // 首次及每 10 分钟报一次计数,保留「这问题还在发生」的可观测性
    if (now - lastNoticeAt >= 10 * 60 * 1000) {
      lastNoticeAt = now
      origWarn(
        `[${new Date().toISOString()}] 🔕 已抑制 ${suppressed} 条失效 Server Action 报错(部署更新后的旧请求/探测,无实际影响)`
      )
    }
  }

  console.error = (...args: unknown[]) => filtered(origError, ...args)
  console.warn = (...args: unknown[]) => filtered(origWarn, ...args)
}
