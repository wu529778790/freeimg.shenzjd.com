# 🎨 FreeImg

> 基于 Gitee AI 的免费 2K 图片生成器，内置 18000+ AI 提示词库与 12 种预设风格，每天可免费生成 100 张。

白嫖 Gitee AI 的 Z-Image-Turbo 模型，只需一个免费访问令牌，即可开启你的 AI 创作之旅。

## ✨ 功能特性

| 特性 | 说明 |
|------|------|
| ⚡ 极速生成 | 基于 Z-Image-Turbo 模型，8 步快速生成 2K 高清图片 |
| 🆓 完全免费 | 每天 100 张免费生成额度，2K 高清分辨率 |
| 🎨 风格预设 | 12 种预设风格（公众号封面、小红书封面、知识卡片、海报、手绘、赛博朋克等），按平台分组，一键套用 |
| 📐 多尺寸支持 | 1:1 / 4:3 / 3:4 / 3:2 / 2:3 / 16:9 / 9:16 七种比例，适配公众号、小红书等平台 |
| 📚 提示词库 | 内置 18000+ 精选 AI 提示词，按用途 / 风格 / 主体分类，支持关键词搜索 |
| 🗑️ 历史记录 | 自动保存生成记录，支持单条删除、一键重新下载 |
| ☁️ 图床上传 | 一键把生成图上传到你的 GitHub 图床（与 img.shenzjd.com 共用图床仓库，自动跟随图床站配置的分支与目录），外链自动复制，换设备不丢图 |
| 🔒 隐私安全 | API Key 仅保存在本地浏览器，不会上传到任何第三方服务器 |
| 📱 多端适配 | 响应式设计，电脑、平板、手机都能流畅使用 |
| 🌓 深色/浅色 | 跟随系统自动切换深色与浅色主题 |

## 🗂️ 风格预设

| 平台 | 预设风格 |
|------|----------|
| 微信公众号 | 公众号封面、知识卡片 |
| 小红书 | 小红书封面、金句卡片、图文卡片 |
| 通用风格 | 海报封面、手绘涂鸦、复古胶片、赛博朋克、水彩插画、3D 卡通、中国风国潮 |

选择风格后会自动附加风格描述并切换到推荐尺寸，也可以不选，直接使用自己的提示词。

## 🚀 在线体验

访问官网即可使用：**[FreeImg 在线生成](https://freeimg.shenzjd.com/)**

## 📖 使用教程

获取免费访问令牌，三步开始你的 AI 创作：

### 第一步：登录 Gitee AI 平台

打开 [https://ai.gitee.com/serverless-api](https://ai.gitee.com/serverless-api) 并登录你的 Gitee 账号。

![登录 Gitee AI 平台](https://cdn.jsdmirror.com/gh/wu529778790/img.shenzjd.com@master/blog/imgx-20260901-114704-pcrs.png)

### 第二步：选择一个模型

下滑页面，随便点开一个模型进入详情页，点击「在线体验」。

![选择一个模型](https://cdn.jsdmirror.com/gh/wu529778790/img.shenzjd.com@master/blog/imgx-20260901-114812-72nk.png)

### 第三步：添加令牌并复制

点击「API」→「添加令牌」，下方代码中的星号会变成你的令牌，复制该值即可回到页面使用。

![添加令牌并复制](https://cdn.jsdmirror.com/gh/wu529778790/img.shenzjd.com@master/blog/imgx-20260901-115033-kbmw.png)

> 💡 **提示**：令牌是免费体验访问令牌，每天有 100 张免费生成额度，2K 分辨率，无任何限制。注意：账号绑定手机号，请保护个人隐私，勿随意分享你的令牌。

## 🛠️ 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm start
```

## 📦 技术栈

- [Next.js 14](https://nextjs.org/) - React 框架
- [React 18](https://react.dev/) - UI 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型系统
- [Turso](https://turso.tech/) - 提示词库数据库（@libsql/client）
- [Gitee AI](https://ai.gitee.com/) - 图片生成 API（Z-Image-Turbo）
- [腾讯云开发 CloudBase](https://docs.cloudbase.net/ai/) - 混元生图 / 提示词助手（@cloudbase/node-sdk）

## 🤖 混元生图（/hunyuan）

独立页面 `/hunyuan`，基于腾讯混元 3.0 模型，采用**自带密钥（BYOK）** 模式：

- 文生图（4 档固定尺寸）、图生图（垫图 ≤10MB，支持 Ctrl+V 粘贴）、AI 提示词润色/翻译（hy3 流式输出）
- 无需微信登录；生成前先配置自己的腾讯云密钥（SecretId / SecretKey），一键列出并选择你的云开发环境，额度来自你自己环境的「小程序成长计划」资源包（10 亿 Token + 10 万张图）
- 密钥仅保存在浏览器 localStorage，随每次请求经 HTTPS 发给本站服务器代调用，服务端不落库、不打日志
- 超过 4000 字的提示词生成时自动用混元精简到 4000 字内（只去重复、保留内容）
- 图片默认不带"AI生成"水印（`TCB_FOOTNOTE` 可定制右下角水印文字，默认空格=无水印）
- 接口：`POST /api/ai/t2i`、`POST /api/ai/i2i`、`POST /api/ai/polish`（流式）、`POST /api/ai/envs`（列环境）；生图/助手均需携带 `cred: { envId, secretId, secretKey }`
- 辅助脚本：`node --env-file=.env.local scripts/tcb-test-byok.mjs --list` 列环境、`--env <envId>` 实测指定环境的可用生图模型

## 🛡 访问守卫（bot-guard）

`lib/bot-guard.ts` 对全部 `/api/*` 生效：**不是真人就直接封 IP**。

判定（命中即封，返回 403 + `Retry-After`，不透露判定细节）：

- UA 不像真实浏览器（curl / wget / python / axios / go-http-client / node-fetch / headless 等）
- 同 IP 每分钟请求数超过阈值（API 默认 40、页面 90）
- 同 IP 每分钟大分页请求超过阈值（`pageSize > 50`，默认 8 次）——对应 2026-10-26 排查到的爬虫行为：单 IP 一天近万次 `pageSize=100` 全量翻页

浏览器预取 / 软导航产生的 RSC 请求（带 `next-router-prefetch` / `rsc` 头或 `?_rsc=` 参数）单独记一笔、默认 300 次/分钟，不挤占正常请求额度。2026-10-26 首版用 40 次/分钟上线后，`/prompts` 页面几十个分类链接的预取把额度刷满，误封了 4 个真实设备，因此：页面内指向动态路由的 `<Link>` 一律 `prefetch={false}`（省掉几十次无谓 SSR），守卫侧再把这这类请求单独计量。

封禁表在进程内存，时长累进 `1h → 24h → 7d → 30d`，重启清空。真浏览器 UA（含微信内置浏览器 / 小程序 WebView）不受 UA 闸影响。

覆盖范围：

- 全部 `/api/*` —— route handler 内调用守卫，读运行时 env，`BOT_GUARD_KEY` / `BOT_GUARD=off` 随时可调
- `/prompts` 页面 —— `src/middleware.ts` 拦截。该页是 `force-dynamic`，每翻一页都要查 Turso + SSR 渲染，爬虫循环翻页等于持续打库
- 静态页 `/`、`/hunyuan` 不拦（构建期已预渲染成静态 HTML，不吃服务端算力）

⚠ 两个落地约束：

1. `middleware.ts` 必须放 `src/` 下。本项目存在遗留的 `src/pages`（只有 CSS），Next 会把 pagesDir 认成 `src/pages` 并只在 `src/` 里查找 middleware，放项目根目录会被**静默忽略**（`middleware-manifest.json` 为空、构建日志不会报错）。
2. edge runtime 的 `process.env` 是构建时内联的，所以页面守卫的阈值写死在 `src/middleware.ts`（当前 90 次/分钟），`BOT_GUARD` 开关与 `BOT_GUARD_KEY` 通行证只对 API 侧生效。页面与 API 的封禁表是两份独立进程内存（middleware 在 edge 沙箱里），但 UA 闸不依赖计数，脚本请求打哪一面都会被各自封掉。

| 环境变量 | 默认 | 说明 |
| --- | --- | --- |
| `BOT_GUARD` | 开 | 设 `off` 整体关闭（应急） |
| `BOT_GUARD_KEY` | 空 | 设置后，请求头 `x-freeimg-key` 命中即放行（自家脚本/对接用） |
| `BOT_GUARD_ALLOW_IPS` | 空 | 精确 IP 白名单，逗号分隔 |
| `BOT_GUARD_RATE_PER_MIN` | 40 | 每 IP 每分钟请求数阈值（API 侧；页面侧固定 90） |
| `BOT_GUARD_RSC_PER_MIN` | 300 | 预取/软导航的 RSC 请求每分钟上限 |
| `BOT_GUARD_BULK_PER_MIN` | 8 | 每 IP 每分钟大分页请求数阈值 |
| `BOT_GUARD_BULK_PAGE_SIZE` | 50 | 大分页判定线（同时也是 `pageSize` 硬上限） |
| `AI_MAX_CONCURRENT` | 4 | 生图接口在途并发上限（单请求峰值内存约 20MB） |
| `AI_QUEUE_TIMEOUT_MS` | 15000 | 生图排队超时，超时回 429 |

客户端 IP 取值链：`eo-connecting-ip`（EdgeOne 注入）→ `x-forwarded-for` 第一段 → `x-real-ip`。

## 🚢 部署

项目内置 `Dockerfile` 与 `nginx.conf`，可通过 Docker 一键部署：

- 构建 Docker 镜像，nginx 托管静态资源与 API 代理
- 推送到 `main` 分支后可通过 CI 自动构建并部署到服务器

访问地址：`https://freeimg.shenzjd.com/`

## 📄 许可证

仅供学习交流使用。
