# 硬件日志管理系统 Dockerfile
# 使用 Node.js 18 Alpine 基础镜像

FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY tsconfig.json ./

# 安装所有依赖（包括开发依赖，用于构建）
RUN npm ci

# 复制源代码
COPY src ./src

# 构建 TypeScript
RUN npm run build

# 生产阶段
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 只安装生产依赖
RUN npm ci --only=production

# 从构建阶段复制编译后的代码
COPY --from=builder /app/dist ./dist

# 复制迁移脚本
COPY src/models/migrations ./dist/models/migrations

# 创建日志目录
RUN mkdir -p logs

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 更改文件所有权
RUN chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "dist/index.js"]
