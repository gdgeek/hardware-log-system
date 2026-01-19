# 硬件日志管理系统

基于 Node.js 的 RESTful API 服务，用于接收、存储和管理来自硬件设备的日志数据。

## 功能特性

- RESTful API 接口用于日志数据接收和查询
- 支持多种日志类型（记录、警告、错误）
- 高级过滤和分页功能
- 统计报表生成
- OpenAPI 3.0 文档和 Swagger UI
- Docker 容器化部署
- GitHub Actions CI/CD 自动化

## 技术栈

- **运行时**: Node.js 18 LTS
- **Web 框架**: Express.js
- **数据库**: MySQL 8.0（腾讯云）
- **ORM**: Sequelize
- **验证**: Joi
- **日志**: Winston
- **API 文档**: Swagger/OpenAPI 3.0
- **测试**: Jest + fast-check（基于属性的测试）
- **语言**: TypeScript

## 项目结构

```
hardware-log-system/
├── src/
│   ├── config/          # 配置模块
│   │   ├── database.ts  # 数据库连接配置
│   │   ├── env.ts       # 环境变量验证
│   │   └── logger.ts    # Winston 日志配置
│   ├── middleware/      # Express 中间件
│   │   ├── ValidationMiddleware.ts  # 请求验证
│   │   ├── ErrorMiddleware.ts       # 错误处理
│   │   └── LoggingMiddleware.ts     # 访问日志
│   ├── models/          # Sequelize 数据库模型
│   │   ├── Log.ts       # 日志模型
│   │   └── migrations/  # 数据库迁移脚本
│   ├── repositories/    # 数据访问层
│   │   └── LogRepository.ts
│   ├── routes/          # API 路由处理器
│   │   ├── LogRoutes.ts     # 日志路由
│   │   └── ReportRoutes.ts  # 报表路由
│   ├── services/        # 业务逻辑层
│   │   ├── LogService.ts    # 日志服务
│   │   └── ReportService.ts # 报表服务
│   ├── validation/      # 数据验证
│   │   ├── schemas.ts   # Joi 验证模式
│   │   └── validator.ts # 验证工具函数
│   ├── types/           # TypeScript 类型定义
│   ├── app.ts           # Express 应用配置
│   └── index.ts         # 应用入口
├── logs/                # 应用日志目录
├── .env.example         # 环境变量模板
├── Dockerfile           # Docker 镜像构建文件
├── docker-compose.yml   # Docker Compose 配置
├── package.json         # 项目依赖
├── tsconfig.json        # TypeScript 配置
└── jest.config.js       # Jest 测试配置
```

## 快速开始

### 前置要求

- Node.js 18 或更高版本
- MySQL 8.0
- pnpm 10 或更高版本

### 安装步骤

1. 克隆仓库：
```bash
git clone <repository-url>
cd hardware-log-system
```

2. 安装依赖：
```bash
pnpm install
```

3. 配置环境变量：
```bash
cp .env.example .env
# 编辑 .env 文件，填入你的配置
```

4. 设置数据库：
```bash
# 在 MySQL 中创建数据库
mysql -u root -p
CREATE DATABASE hardware_logs CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 运行迁移脚本
pnpm run migrate
```

### 开发模式

开发模式运行：
```bash
pnpm run dev
```

构建项目：
```bash
pnpm run build
```

生产模式运行：
```bash
pnpm start
```

### 测试

运行所有测试：
```bash
pnpm test
```

仅运行单元测试：
```bash
pnpm run test:unit
```

运行集成测试：
```bash
pnpm run test:integration
```

生成覆盖率报告：
```bash
pnpm run test:coverage
```

### 代码检查

运行 ESLint：
```bash
pnpm run lint
```

## API 端点

### 日志管理

- `POST /api/logs` - 创建日志记录
- `GET /api/logs` - 查询日志（支持过滤和分页）
- `GET /api/logs/:id` - 获取单条日志

### 报表生成

- `GET /api/reports/device/:uuid` - 设备统计报表
- `GET /api/reports/timerange` - 时间段统计报表
- `GET /api/reports/errors` - 错误统计报表

### 系统

- `GET /health` - 健康检查

## 环境变量

查看 `.env.example` 了解所有可用的配置选项。

### 必需变量：
- `DB_HOST` - 数据库主机地址
- `DB_NAME` - 数据库名称
- `DB_USER` - 数据库用户名
- `DB_PASSWORD` - 数据库密码

### 可选变量（带默认值）：
- `NODE_ENV` - 运行环境（development/production/test）
- `PORT` - 服务器端口（默认：3000）
- `DB_PORT` - 数据库端口（默认：3306）
- `DB_POOL_MIN` - 连接池最小连接数（默认：2）
- `DB_POOL_MAX` - 连接池最大连接数（默认：10）
- `LOG_LEVEL` - 日志级别（默认：info）
- `LOG_FILE` - 日志文件路径（默认：logs/app.log）

## API 文档

服务器运行后，访问 Swagger UI：
```
http://localhost:3000/api-docs
```

## Docker 部署

### 使用 Docker Compose（推荐）

启动所有服务（应用 + MySQL）：
```bash
docker-compose up -d
```

查看日志：
```bash
docker-compose logs -f
```

停止服务：
```bash
docker-compose down
```

### 手动构建 Docker 镜像

构建镜像：
```bash
docker build -t hardware-log-system .
```

运行容器：
```bash
docker run -d \
  -p 3000:3000 \
  -e DB_HOST=your-mysql-host \
  -e DB_NAME=hardware_logs \
  -e DB_USER=root \
  -e DB_PASSWORD=your-password \
  --name hardware-log-system \
  hardware-log-system
```

## 架构设计

系统采用三层架构模式：

1. **API 层（Routes）**：处理 HTTP 请求，验证输入，格式化响应
2. **业务逻辑层（Services）**：实现业务规则，数据转换，报表生成
3. **数据访问层（Repositories）**：封装数据库操作，执行查询

### 数据流

```
客户端请求
    ↓
API 路由（验证中间件）
    ↓
业务逻辑服务
    ↓
数据访问仓库
    ↓
MySQL 数据库
```

## 测试策略

项目采用双重测试方法：

1. **单元测试**：验证具体示例和边界情况
2. **基于属性的测试**：使用 fast-check 验证通用属性在所有输入下都成立

每个属性测试运行至少 100 次迭代，确保代码的正确性。

## 文档

详细文档请查看 [docs/](docs/README.md) 目录：

- **部署文档**
  - [腾讯云部署指南](docs/deployment/TENCENT_CLOUD_DEPLOYMENT.md)
  - [Portainer 部署指南](docs/deployment/PORTAINER_DEPLOYMENT.md)

- **开发文档**
  - [本地开发环境搭建](docs/development/SETUP.md)
  - [测试配置说明](docs/development/TEST_SETUP_SUMMARY.md)

## 许可证

MIT
