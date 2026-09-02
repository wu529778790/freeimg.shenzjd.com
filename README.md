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

## 🚢 部署

项目内置 `Dockerfile` 与 `nginx.conf`，可通过 Docker 一键部署：

- 构建 Docker 镜像，nginx 托管静态资源与 API 代理
- 推送到 `main` 分支后可通过 CI 自动构建并部署到服务器

访问地址：`https://freeimg.shenzjd.com/`

## 📄 许可证

仅供学习交流使用。
