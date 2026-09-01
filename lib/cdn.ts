/**
 * 提示词图片 CDN 地址改写
 *
 * 数据库中图片原始地址来自 https://cms-assets.youmind.com(境外 CDN,国内访问需翻墙)。
 * 全部图片已由 scripts/sync-cdn-images.mjs 下载到仓库 cdn/prompts/ 目录,
 * 通过 GitHub + jsdmirror 访问,不再走服务端代理。
 * 上游 URL 与本地文件同名,改写即替换前缀。
 */

/** jsdmirror 上本仓库 cdn/prompts/ 的访问前缀 */
export const CDN_IMG_BASE =
  'https://cdn.jsdmirror.com/gh/wu529778790/freeimg.shenzjd.com@main/cdn/prompts'

/** 图片原始来源域名 */
const UPSTREAM_IMG_HOST = 'cms-assets.youmind.com'

/** 将上游图片 URL 改写为 jsdmirror CDN 地址;非上游域名原样返回 */
export function rewriteImgUrl(url: string): string {
  if (!url || !url.includes(UPSTREAM_IMG_HOST)) return url
  const name = url.split('/').pop()?.split('?')[0]
  if (!name) return url
  // 本地文件统一为 <原文件名>.webp(见 scripts/sync-cdn-images.mjs)
  const fileName = name.endsWith('.webp') ? name : name + '.webp'
  return `${CDN_IMG_BASE}/${fileName}`
}
