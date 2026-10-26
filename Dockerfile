# 构建阶段：编译 Next.js(SSR + API)
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 运行阶段：Next standalone 单进程服务(自带静态资源 + gzip)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Node 堆护栏:V8 默认按物理内存推导上限(大机器上能冲到 1GB+)。
# 峰值主要来自 SSR 渲染大列表与生图接口的图片 base64,压到 512MB 足够,
# 超限时进程自己 GC/退出重启,而不是把整机内存吃光。
ENV NODE_OPTIONS="--max-old-space-size=512"

# 拷贝 standalone 产物、静态资源与 public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ >/dev/null 2>&1 || exit 1

# 运行时需注入 TURSO_URL / TURSO_AUTH_TOKEN 以及 CloudBase AI 凭据
# (TCB_ENV_ID / TCB_SECRET_ID / TCB_SECRET_KEY;
#  可选: TCB_USER_DAILY_IMAGE_LIMIT 默认 10,TCB_GLOBAL_DAILY_IMAGE_LIMIT 默认 500,
#  TCB_ADMIN_OPENIDS 管理员 openid 列表不限量,TCB_FOOTNOTE 图片水印文字)
CMD ["node", "server.js"]
