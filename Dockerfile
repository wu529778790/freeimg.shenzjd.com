# 构建阶段：编译 Vite + React 静态资源
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV NODE_ENV=production
RUN npm run build

# 运行阶段：用 nginx 托管静态文件
FROM nginx:alpine AS runtime
WORKDIR /usr/share/nginx/html

# 复制构建产物
COPY --from=build /app/dist ./

# 自定义 nginx 配置：支持 SPA 路由回退 + gzip
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]