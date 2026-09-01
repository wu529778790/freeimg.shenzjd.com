# 🎨 GiteeFreeImg

> 基于 Gitee AI 的免费 2K 图片生成器，每天可免费生成 1000 次，无任何限制。

白嫖 Gitee AI 的 Z-Image-Turbo 模型，只需一个免费访问令牌，即可开启你的 AI 创作之旅。

## ✨ 功能特性

| 特性 | 说明 |
|------|------|
| ⚡ 极速生成 | 基于 Z-Image-Turbo 模型，快速生成高清图片 |
| 🆓 完全免费 | 每天 1000 次免费生成额度，2K 高清分辨率 |
| 🔒 隐私安全 | API Key 仅保存在本地浏览器，不会上传到任何第三方服务器 |
| 🎨 多尺寸支持 | 支持方形、横版、竖版等多种尺寸 |
| 📚 历史记录 | 自动保存生成记录，随时回看和下载 |
| 📱 多端适配 | 响应式设计，电脑、平板、手机都能流畅使用 |
| 🌓 深色/浅色 | 跟随系统自动切换深色与浅色主题 |

## 🚀 在线体验

访问官网即可使用：**[GiteeFreeImg 在线生成](http://blog.shenzjd.com/GiteeFreeImg/)**

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

> 💡 **提示**：令牌是免费体验访问令牌，每天有 1000 次免费生成额度，2K 分辨率，无任何限制。注意：账号绑定手机号，请保护个人隐私，勿随意分享你的令牌。

## 🛠️ 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview
```

## 📦 技术栈

- [Vite](https://vite.dev/) - 构建工具
- [React](https://react.dev/) - UI 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型系统
- [Gitee AI](https://ai.gitee.com/) - 图片生成 API

## 🚢 部署

项目已配置 GitHub Pages 自动部署（`.github/workflows/deploy.yml`），推送到 `main` 分支后会自动构建并部署。

访问地址：`https://wu529778790.github.io/GiteeFreeImg/`

## 📄 许可证

仅供学习交流使用。