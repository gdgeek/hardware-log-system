# CI/CD 部署流水线指南 (三阶段)

本指南介绍如何配置自动化流水线，实现从代码提交到线上 Portainer 环境的自动部署。

## 流水线概览

我们将部署过程分为三个独立且连续的阶段：

1.  **测试 (Test)**: 验证代码质量、运行测试并检查覆盖率。
2.  **构建 (Build)**: 打包应用并推送 Docker 镜像。
3.  **部署 (Deploy)**: 通过 Portainer Webhook 触发线上环境更新。

---

## 阶段一：测试 (Test)

在 GitHub Actions 中自动触发。

- **关键任务**:
  - 安装依赖 (`pnpm install`)
  - 代码检查 (`pnpm run lint`)
  - 运行测试 (`pnpm run test:coverage`)
- **要求**: 覆盖率需达到阈值（Statements > 75%, Branches > 60%）。

---

## 阶段二：构建 (Build)

测试通过后进入构建阶段。

- **执行环境**: Docker Buildx
- **关键任务**: 登录仓库、构建镜像、推送标签（如 `latest`）。
- **生产镜像**: `hkccr.ccs.tencentyun.com/gdgeek/log:latest`

---

## 阶段三：部署 (Deploy)

构建完成后，通过 Portainer **Webhook** 触发部署。

### 1. 获取 Webhook URL

1. 在 Portainer 中打开您的 **Stack** (`hardware-log-system`)。
2. 在 **Webhooks** 部分开启服务 Webhook。
3. 复制生成的 **Webhook URL**。

### 2. 配置 Webhook 触发

在 CI/CD 脚本的最后一步发送通知：

```bash
curl -X POST "${{ secrets.PORTAINER_WEBHOOK_URL }}"
```

---

## 外部服务配置 (腾讯云)

本项目支持直接连接腾讯云托管的 **MySQL** 和 **Redis**。

### 1. Redis 缓存说明

Redis 是**可选**的缓存层。

- **开启**: 设置 `REDIS_ENABLED=true` 并配好主机地址。
- **关闭**: 设置 `REDIS_ENABLED=false`，系统将直接查询数据库（推荐在高并发场景开启）。

### 2. 生产环境变量参考

在 Portainer Stack 中配置：

| 变量名                  | 说明                           |
| :---------------------- | :----------------------------- |
| `LOG_LEVEL`             | `info` (建议生产环境保持 info) |
| `LOG_FILE`              | `logs/app.log` (相对路径)      |
| `API_PREFIX`            | `/api/v1`                      |
| `REDIS_ENABLED`         | `true`                         |
| `REDIS_HOST`            | `10.x.x.x` (腾讯云内网 IP)     |
| `REDIS_PORT`            | `6379`                         |
| `REDIS_PASSWORD`        | (无密码请保持为空)             |
| `REDIS_TTL`             | `3600` (缓存时长，秒)          |
| `PORTAINER_WEBHOOK_URL` | 部署触发钩子 (GitHub Secret)   |

---

## 附录：使用自托管 Redis (Portainer Stack)

如果您不想使用云服务，而是想在 Portainer 内部直接运行 Redis 容器，可以按以下方式修改您的 Stack 文件：

### 1. YAML 配置片段

在 `services` 节点下增加：

```yaml
redis:
  image: redis:7-alpine
  container_name: hardware-log-redis
  restart: always
  networks:
    - app-network
```

### 2. 应用环境变量调整

将 `app` 服务的环境变量指向这个容器：

- `REDIS_ENABLED`: `true`
- `REDIS_HOST`: `redis` (使用服务名)
- `REDIS_PORT`: `6379`
- `REDIS_PASSWORD`: (保持为空)

---

## 故障排查

- **部署未生效**: 检查 Portainer 是否已授权拉取腾讯云私有镜像。
- **连接超时**: 确保腾讯云安全组已允许 Portainer 服务器的 IP 访问 MySQL/Redis 对应端口。
