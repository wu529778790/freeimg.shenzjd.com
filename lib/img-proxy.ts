/**
 * 外部图片代理配置
 *
 * 背景:数据库中大量图片来自 https://cms-assets.youmind.com(境外 CDN,国内访问需翻墙),
 * 且页面不应直接引用第三方域名。因此统一将此类地址改写为本站代理路径 /api/img-proxy/...,
 * 由服务端拉取上游图片后透传给浏览器。
 */

/** 上游图片 CDN 域名(不含协议) */
export const UPSTREAM_IMG_HOST = 'cms-assets.youmind.com'
/** 上游图片 CDN 完整前缀 */
export const UPSTREAM_IMG_BASE = `https://${UPSTREAM_IMG_HOST}`
/** 本站代理路由前缀 */
export const IMG_PROXY_PREFIX = '/api/img-proxy'

/** 将单个外部图片 URL 改写为本站代理路径;非目标域名原样返回 */
export function rewriteImgUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith(UPSTREAM_IMG_BASE)) {
    // 保留路径与查询串:/media/xx.jpg?x-oss-process=...
    return `${IMG_PROXY_PREFIX}${url.slice(UPSTREAM_IMG_BASE.length)}`
  }
  return url
}
