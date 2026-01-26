# Portainer 部署指南

本指南将指导您如何使用 Portainer 的 **Stacks** 功能将“硬件日志管理系统”部署到线上环境。

## 准备工作

1. **环境要求**：已安装 Portainer 的 Linux 服务器，且具备 Docker 运行环境。
2. **所需文件**：项目根目录下的 `portainer-stack.yml`。
3. **域名/IP**：确保服务器的 3000 端口已开放（或您自定义的端口）。

## 部署步骤

### 第一步：创建 Stack

1. 登录您的 Portainer 管理界面。
2. 在左侧菜单点击 **Stacks**。
3. 点击右上角的 **+ Add stack** 按钮。

### 第二步：配置 Stack

1. **Name**: 输入 `hardware-log-system`。
2. **Build method**: 选择 **Web editor**。
3. **Web editor**: 将项目中的 `portainer-stack.yml` 内容完整复制并粘贴到编辑器中。

### 第三步：配置环境变量

在 Web 编辑器下方的 **Environment variables** 部分，点击 **+ Add environment variable**，添加以下关键变量：

| 变量名        | 示例值                 | 说明                                  |
| :------------ | :--------------------- | :------------------------------------ |
| `DB_PASSWORD` | `your_strong_password` | **必填**。MySQL root 用户的密码。     |
| `APP_PORT`    | `3000`                 | 可选。应用对外暴露的端口。            |
| `LOG_LEVEL`   | `info`                 | 可选。日志记录级别。                  |
| `JWT_SECRET`  | `your_jwt_secret_key`  | 可选。用于生成管理后台 Token 的密钥。 |

> [!IMPORTANT]
> 请务必设置一个强密码作为 `DB_PASSWORD`。

### 第四步：部署 Stack

1. 检查配置无误后，点击底部的 **Deploy the stack**。
2. 等待容器启动。您可以在 **Containers** 页面查看 `hardware-log-system` 和 `hardware-log-mysql` 的状态。

## 常用操作

### 1. 查看运行日志

在 Portainer 的 **Containers** 页面，找到 `hardware-log-system` 容器，点击 **Logs** 图标即可查看应用实时日志。

### 2. 数据库迁移

系统启动时会自动运行迁移脚本，如果需要手动操作，可以进入容器终端 (Console) 运行：

```bash
node dist/index.js --migrate
```

### 3. 健康检查

应用暴露了 `/health` 端点，Docker 会自动进行健康检查。您可以在镜像列表中看到健康状态。

## 镜像地址说明

本配置默认使用腾讯云镜像（推荐，国内访问快）：
`hkccr.ccs.tencentyun.com/gdgeek/log:latest`

如果需要使用 GitHub 镜像，请修改 YAML 文件：
`ghcr.io/gdgeek/hardware-log-system:latest`
