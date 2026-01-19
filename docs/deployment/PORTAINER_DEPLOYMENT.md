# Portainer 部署指南

本指南介绍如何使用 Portainer 在腾讯云服务器上部署硬件日志管理系统。

## 目录

- [前置要求](#前置要求)
- [Portainer 安装](#portainer-安装)
- [部署方式](#部署方式)
- [方式一：使用 Stack 部署](#方式一使用-stack-部署)
- [方式二：使用 Git 仓库部署](#方式二使用-git-仓库部署)
- [环境变量配置](#环境变量配置)
- [验证部署](#验证部署)
- [运维管理](#运维管理)

## 前置要求

- 腾讯云服务器（已安装 Docker）
- Portainer CE 已安装并运行
- 开放端口：9000（Portainer）、3000（应用）

## Portainer 安装

如果还没有安装 Portainer，执行以下命令：

```bash
# 创建 Portainer 数据卷
docker volume create portainer_data

# 运行 Portainer
docker run -d \
  -p 9000:9000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

访问 `http://<服务器IP>:9000` 完成初始化设置。

## 部署方式

### 方式一：使用 Stack 部署（推荐）

1. 登录 Portainer Web UI
2. 选择你的 Docker 环境
3. 点击左侧菜单 **Stacks**
4. 点击 **+ Add stack**
5. 输入 Stack 名称：`hardware-log-system`
6. 选择 **Web editor**
7. 粘贴以下配置：

```yaml
version: '3.8'

services:
  app:
    image: node:18-alpine
    container_name: hardware-log-system
    working_dir: /app
    command: sh -c "npm install -g pnpm && pnpm install --prod && node dist/index.js"
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=hardware_logs
      - DB_USER=root
      - DB_PASSWORD=${DB_PASSWORD:-your_secure_password}
      - DB_POOL_MIN=2
      - DB_POOL_MAX=10
      - LOG_LEVEL=info
      - LOG_FILE=/app/logs/app.log
    depends_on:
      mysql:
        condition: service_healthy
    volumes:
      - app_logs:/app/logs
    networks:
      - app-network
    restart: always
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      start_period: 30s
      retries: 3

  mysql:
    image: mysql:8.0
    container_name: hardware-log-mysql
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD:-your_secure_password}
      - MYSQL_DATABASE=hardware_logs
      - MYSQL_CHARACTER_SET_SERVER=utf8mb4
      - MYSQL_COLLATION_SERVER=utf8mb4_unicode_ci
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - app-network
    restart: always
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${DB_PASSWORD:-your_secure_password}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

networks:
  app-network:
    driver: bridge

volumes:
  mysql_data:
  app_logs:
```

8. 在 **Environment variables** 部分添加：
   - `DB_PASSWORD`: 你的数据库密码

9. 点击 **Deploy the stack**

### 方式二：使用 Git 仓库部署

1. 登录 Portainer Web UI
2. 选择你的 Docker 环境
3. 点击左侧菜单 **Stacks**
4. 点击 **+ Add stack**
5. 输入 Stack 名称：`hardware-log-system`
6. 选择 **Repository**
7. 填写以下信息：
   - **Repository URL**: `https://github.com/gdgeek/hardware-log-system`
   - **Repository reference**: `main`
   - **Compose path**: `docker-compose.portainer.yml`

8. 在 **Environment variables** 部分添加：
   - `DB_PASSWORD`: 你的数据库密码

9. 点击 **Deploy the stack**

## 环境变量配置

在 Portainer 的 Stack 配置中，添加以下环境变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| DB_PASSWORD | 数据库密码（必填） | MySecureP@ssw0rd |
| NODE_ENV | 运行环境 | production |
| LOG_LEVEL | 日志级别 | info |
| DB_POOL_MAX | 最大连接数 | 10 |

## 验证部署

### 1. 检查容器状态

在 Portainer 中：
- 点击 **Containers**
- 确认 `hardware-log-system` 和 `hardware-log-mysql` 状态为 `running`

### 2. 测试健康检查

```bash
curl http://<服务器IP>:3000/health
```

预期响应：
```json
{
  "status": "ok",
  "timestamp": "2024-01-19T12:00:00.000Z"
}
```

### 3. 测试 API

```bash
# 创建日志
curl -X POST http://<服务器IP>:3000/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "deviceUuid": "550e8400-e29b-41d4-a716-446655440000",
    "dataType": "record",
    "key": "temperature",
    "value": {"celsius": 25.5, "humidity": 60}
  }'

# 查询日志
curl http://<服务器IP>:3000/api/logs
```

## 运维管理

### 查看日志

1. 在 Portainer 中点击 **Containers**
2. 点击 `hardware-log-system` 容器
3. 点击 **Logs** 查看实时日志

### 重启服务

1. 在 Portainer 中点击 **Stacks**
2. 选择 `hardware-log-system`
3. 点击 **Stop** 然后 **Start**

或者重启单个容器：
1. 点击 **Containers**
2. 选择容器
3. 点击 **Restart**

### 更新部署

如果使用 Git 仓库部署：
1. 点击 **Stacks**
2. 选择 `hardware-log-system`
3. 点击 **Pull and redeploy**

### 数据库备份

在 Portainer 中执行：
1. 点击 **Containers**
2. 选择 `hardware-log-mysql`
3. 点击 **Console**
4. 选择 `/bin/bash`
5. 执行备份命令：

```bash
mysqldump -u root -p hardware_logs > /var/lib/mysql/backup.sql
```

### 查看资源使用

1. 点击 **Containers**
2. 选择容器
3. 点击 **Stats** 查看 CPU、内存使用情况

## 故障排查

### 容器无法启动

1. 检查日志：Containers → 选择容器 → Logs
2. 检查环境变量是否正确配置
3. 检查端口是否被占用

### 数据库连接失败

1. 确认 MySQL 容器健康状态
2. 检查 `DB_PASSWORD` 环境变量
3. 检查网络连接：两个容器应在同一网络

### 健康检查失败

1. 等待应用完全启动（约 30 秒）
2. 检查应用日志是否有错误
3. 确认端口映射正确

## 安全建议

1. **修改默认密码**：使用强密码替换 `DB_PASSWORD`
2. **限制端口访问**：在腾讯云安全组中限制 3000 端口的访问来源
3. **定期备份**：设置定时任务备份数据库
4. **更新镜像**：定期更新 Docker 镜像以获取安全补丁

## 相关文件

- `docker-compose.portainer.yml` - Portainer 专用配置
- `docker-compose.yml` - 标准 Docker Compose 配置
- `Dockerfile` - 应用镜像构建文件
