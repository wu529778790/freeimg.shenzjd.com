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
# Node 内存参数(小内存服务器关键)。
#
# V8 的默认堆上限是「按物理内存推导」的,而容器里读到的是**宿主机**内存 ——
# 十几个容器共用一台机器时,每个 Node 都以为整机内存都是自己的,于是 GC 非常消极:
# 临时对象(SSR 渲染树、查询结果、图片 base64)堆着不回收,RSS 一路涨到几百 MB。
# 这就是「逻辑很简单却占这么多」的真实原因,不是代码里有泄漏。
#
# --max-old-space-size=256  老生代上限。实测空闲 RSS 147MB、单页 SSR 峰值远低于此,
#                           压到 256 会让 V8 提前 GC,把内存还给系统。
# --max-semi-space-size=4   新生代每个半区上限(默认 16MB,三区合计 ~48MB)。
#                           降到 4MB 省下约 30MB 常驻,代价只是 GC 稍频繁。
ENV NODE_OPTIONS="--max-old-space-size=256 --max-semi-space-size=4"

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
