# 腾讯云 Docker 部署指南

本指南介绍如何在腾讯云服务器上部署硬件日志管理系统。

## 目录

- [前置要求](#前置要求)
- [服务器准备](#服务器准备)
- [部署步骤](#部署步骤)
- [配置说明](#配置说明)
- [运维管理](#运维管理)
- [故障排查](#故障排查)
- [安全建议](#安全建议)

## 前置要求

### 腾讯云资源

- **云服务器 CVM**：
  - 推荐配置：2核4GB内存，50GB系统盘
  - 操作系统：Ubuntu 22.04 LTS 或 CentOS 8
  - 带宽：至少 1Mbps

- **安全组配置**：
  - 入站规则：开放 3000 端口（应用）
  - 入站规则：开放 22 端口（SSH）
  - 可选：开放 3306 端口（MySQL，仅用于外部访问）

### 本地环境

- Git
- SSH 客户端

## 服务器准备

### 1. 连接到腾讯云服务器

```bash
ssh ubuntu@<your-server-ip>
# 或
ssh root@<your-server-ip>
```

### 2. 更新系统

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 3. 安装 Docker

#### Ubuntu/Debian

```bash
# 安装依赖
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# 添加 Docker 官方 GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加 Docker 仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker
```

#### CentOS/RHEL

```bash
# 安装依赖
sudo yum install -y yum-utils

# 添加 Docker 仓库
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装 Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### 4. 安装 Docker Compose

```bash
# 下载 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

### 5. 配置 Docker 用户权限（可选）

```bash
# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录以使更改生效
exit
# 重新 SSH 连接
```

## 部署步骤

### 1. 克隆项目

```bash
# 创建项目目录
mkdir -p ~/apps
cd ~/apps

# 克隆仓库
git clone https://github.com/gdgeek/hardware-log-system.git
cd hardware-log-system
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.production

# 编辑生产环境配置
nano .env.production
# 或使用 vim
vim .env.production
```

**重要配置项**：

```env
# 服务器配置
NODE_ENV=production
PORT=3000

# 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_NAME=hardware_logs
DB_USER=root
DB_PASSWORD=<strong-password-here>  # 请修改为强密码！

# 数据库连接池
DB_POOL_MIN=2
DB_POOL_MAX=10

# 日志配置
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log

# API 配置
API_PREFIX=/api
MAX_PAGE_SIZE=100
DEFAULT_PAGE_SIZE=20
```

### 3. 创建生产环境 Docker Compose 配置

```bash
# 使用生产环境配置
cp docker-compose.yml docker-compose.prod.yml
```

编辑 `docker-compose.prod.yml`，确保配置正确：

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: hardware-log-system
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    depends_on:
      mysql:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs
    networks:
      - app-network
    restart: always

  mysql:
    image: mysql:8.0
    container_name: hardware-log-mysql
    env_file:
      - .env.production
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD}
      - MYSQL_DATABASE=${DB_NAME}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./src/models/migrations/001_create_logs_table.sql:/docker-entrypoint-initdb.d/001_create_logs_table.sql
    networks:
      - app-network
    restart: always
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${DB_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  app-network:
    driver: bridge

volumes:
  mysql_data:
    driver: local
```

### 4. 构建和启动服务

```bash
# 构建镜像
docker-compose -f docker-compose.prod.yml build

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

### 5. 验证部署

```bash
# 检查容器状态
docker-compose -f docker-compose.prod.yml ps

# 测试健康检查
curl http://localhost:3000/health

# 测试 API
curl http://localhost:3000/api/logs
```

## 配置说明

### 环境变量详解

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| NODE_ENV | 运行环境 | production | 是 |
| PORT | 应用端口 | 3000 | 是 |
| DB_HOST | 数据库主机 | mysql | 是 |
| DB_PORT | 数据库端口 | 3306 | 是 |
| DB_NAME | 数据库名称 | hardware_logs | 是 |
| DB_USER | 数据库用户 | root | 是 |
| DB_PASSWORD | 数据库密码 | - | 是 |
| DB_POOL_MIN | 最小连接数 | 2 | 否 |
| DB_POOL_MAX | 最大连接数 | 10 | 否 |
| LOG_LEVEL | 日志级别 | info | 否 |
| LOG_FILE | 日志文件路径 | /app/logs/app.log | 否 |

### 端口映射

- **3000**: 应用 HTTP 端口
- **3306**: MySQL 数据库端口（可选，建议不对外开放）

### 数据持久化

- **mysql_data**: MySQL 数据卷
- **./logs**: 应用日志目录

## 运维管理

### 常用命令

```bash
# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f app
docker-compose -f docker-compose.prod.yml logs -f mysql

# 重启服务
docker-compose -f docker-compose.prod.yml restart

# 停止服务
docker-compose -f docker-compose.prod.yml stop

# 启动服务
docker-compose -f docker-compose.prod.yml start

# 完全停止并删除容器
docker-compose -f docker-compose.prod.yml down

# 停止并删除容器和数据卷（危险！）
docker-compose -f docker-compose.prod.yml down -v
```

### 更新部署

```bash
# 1. 拉取最新代码
cd ~/apps/hardware-log-system
git pull origin main

# 2. 重新构建镜像
docker-compose -f docker-compose.prod.yml build

# 3. 重启服务
docker-compose -f docker-compose.prod.yml up -d

# 4. 查看日志确认
docker-compose -f docker-compose.prod.yml logs -f
```

### 数据库备份

```bash
# 备份数据库
docker exec hardware-log-mysql mysqldump -u root -p<password> hardware_logs > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
docker exec -i hardware-log-mysql mysql -u root -p<password> hardware_logs < backup_20240119_120000.sql
```

### 日志管理

```bash
# 查看应用日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log

# 清理旧日志（保留最近7天）
find logs/ -name "*.log" -mtime +7 -delete
```

### 监控和告警

#### 使用 Docker Stats

```bash
# 实时监控容器资源使用
docker stats hardware-log-system hardware-log-mysql
```

#### 设置日志轮转

创建 `/etc/logrotate.d/hardware-log-system`：

```
/home/ubuntu/apps/hardware-log-system/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 ubuntu ubuntu
}
```

## 故障排查

### 容器无法启动

```bash
# 查看容器日志
docker-compose -f docker-compose.prod.yml logs app

# 检查容器状态
docker-compose -f docker-compose.prod.yml ps

# 进入容器调试
docker exec -it hardware-log-system sh
```

### 数据库连接失败

```bash
# 检查 MySQL 容器状态
docker-compose -f docker-compose.prod.yml logs mysql

# 测试数据库连接
docker exec -it hardware-log-mysql mysql -u root -p

# 检查网络连接
docker network inspect hardware-log-system_app-network
```

### 端口被占用

```bash
# 查看端口占用
sudo netstat -tulpn | grep 3000
sudo netstat -tulpn | grep 3306

# 修改端口映射
# 编辑 docker-compose.prod.yml，修改 ports 配置
```

### 磁盘空间不足

```bash
# 查看磁盘使用
df -h

# 清理 Docker 资源
docker system prune -a

# 清理旧镜像
docker image prune -a

# 清理未使用的卷
docker volume prune
```

## 安全建议

### 1. 防火墙配置

```bash
# Ubuntu UFW
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw enable

# CentOS Firewalld
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 2. 使用 Nginx 反向代理

安装 Nginx：

```bash
sudo apt install -y nginx  # Ubuntu
sudo yum install -y nginx  # CentOS
```

配置 Nginx (`/etc/nginx/sites-available/hardware-log-system`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/hardware-log-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. 配置 SSL/TLS（使用 Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 4. 限制数据库访问

在 `docker-compose.prod.yml` 中，移除 MySQL 的端口映射：

```yaml
mysql:
  # 注释掉或删除这一行
  # ports:
  #   - "3306:3306"
```

### 5. 使用 Docker Secrets（可选）

对于敏感信息，可以使用 Docker Secrets：

```bash
# 创建 secret
echo "your-strong-password" | docker secret create db_password -

# 在 docker-compose.yml 中使用
secrets:
  db_password:
    external: true
```

### 6. 定期更新

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 更新 Docker 镜像
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## 性能优化

### 1. 调整 MySQL 配置

创建 `mysql.cnf`:

```ini
[mysqld]
max_connections=200
innodb_buffer_pool_size=512M
innodb_log_file_size=128M
query_cache_size=0
query_cache_type=0
```

在 `docker-compose.prod.yml` 中挂载：

```yaml
mysql:
  volumes:
    - ./mysql.cnf:/etc/mysql/conf.d/custom.cnf
```

### 2. 启用 Docker 日志限制

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 监控方案

### 使用 Prometheus + Grafana（可选）

参考 [Prometheus Docker 部署](https://prometheus.io/docs/prometheus/latest/installation/)

## 支持

如有问题，请：
1. 查看日志：`docker-compose -f docker-compose.prod.yml logs`
2. 提交 Issue：https://github.com/gdgeek/hardware-log-system/issues
3. 查看文档：README.md

## 许可证

MIT License
