# 设计文档

## 概述

硬件日志管理系统是一个基于 Node.js 和 Express 框架的 RESTful API 服务。系统采用分层架构设计，包括 API 层、业务逻辑层和数据访问层。使用腾讯云 MySQL 作为持久化存储，通过 Docker 容器化部署，并通过 GitHub Actions 实现 CI/CD 自动化流程。

### 技术栈

- **运行时**: Node.js (LTS 版本)
- **Web 框架**: Express.js
- **数据库**: MySQL 8.0 (腾讯云)
- **ORM**: Sequelize
- **API 文档**: Swagger/OpenAPI 3.0 (swagger-ui-express, swagger-jsdoc)
- **日志**: Winston
- **验证**: Joi
- **容器化**: Docker
- **CI/CD**: GitHub Actions

## 架构

系统采用三层架构模式：

```
┌─────────────────────────────────────────┐
│         API Layer (Routes)              │
│  - 请求验证                              │
│  - 路由处理                              │
│  - 响应格式化                            │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Business Logic Layer (Services)    │
│  - 业务规则                              │
│  - 数据转换                              │
│  - 报表生成                              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│    Data Access Layer (Models/DAL)       │
│  - 数据库操作                            │
│  - 查询构建                              │
│  - 事务管理                              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         MySQL Database                   │
│  - 日志数据存储                          │
│  - 索引优化                              │
└─────────────────────────────────────────┘
```

### 部署架构

```
┌──────────────┐      ┌──────────────┐
│   GitHub     │─────▶│ GitHub       │
│  Repository  │      │  Actions     │
└──────────────┘      └──────┬───────┘
                             │ CI: Build & Test
                             │ CD: Deploy
                      ┌──────▼───────┐
                      │   Docker     │
                      │   Registry   │
                      └──────┬───────┘
                             │
                      ┌──────▼───────┐
                      │   Server     │
                      │  (Docker)    │
                      └──────┬───────┘
                             │
                      ┌──────▼───────┐
                      │  Tencent     │
                      │  Cloud MySQL │
                      └──────────────┘
```

## 组件和接口

### 1. API 路由层 (Routes)

#### LogRoutes
负责处理日志相关的 HTTP 请求。

**端点**:
- `POST /api/logs` - 接收日志数据
- `GET /api/logs` - 查询日志数据
- `GET /api/logs/:id` - 获取单条日志

**职责**:
- 验证请求参数
- 调用 LogService 处理业务逻辑
- 格式化响应数据
- 处理错误并返回适当的 HTTP 状态码

#### ReportRoutes
负责处理报表相关的 HTTP 请求。

**端点**:
- `GET /api/reports/device/:uuid` - 设备统计报表
- `GET /api/reports/timerange` - 时间段统计报表
- `GET /api/reports/errors` - 错误统计报表

**职责**:
- 验证查询参数
- 调用 ReportService 生成报表
- 返回 JSON 格式的统计结果

#### SwaggerRoutes
提供 API 文档访问。

**端点**:
- `GET /api-docs` - Swagger UI 界面
- `GET /api-docs.json` - OpenAPI JSON 规范

### 2. 业务逻辑层 (Services)

#### LogService
处理日志相关的业务逻辑。

**方法**:
```typescript
interface LogService {
  createLog(logData: LogInput): Promise<Log>
  getLogById(id: number): Promise<Log | null>
  queryLogs(filters: LogFilters, pagination: Pagination): Promise<PaginatedResult<Log>>
  validateLogData(logData: LogInput): ValidationResult
}
```

**职责**:
- 验证日志数据格式
- 生成时间戳
- 调用 LogRepository 存储数据
- 处理业务异常

#### ReportService
生成各类统计报表。

**方法**:
```typescript
interface ReportService {
  generateDeviceReport(uuid: string): Promise<DeviceReport>
  generateTimeRangeReport(startTime: Date, endTime: Date): Promise<TimeRangeReport>
  generateErrorReport(): Promise<ErrorReport>
}
```

**职责**:
- 聚合日志数据
- 计算统计指标
- 格式化报表输出

### 3. 数据访问层 (Repositories)

#### LogRepository
封装数据库操作。

**方法**:
```typescript
interface LogRepository {
  create(log: LogData): Promise<Log>
  findById(id: number): Promise<Log | null>
  findByFilters(filters: LogFilters, pagination: Pagination): Promise<Log[]>
  countByFilters(filters: LogFilters): Promise<number>
  aggregateByDevice(uuid: string): Promise<DeviceStats>
  aggregateByTimeRange(start: Date, end: Date): Promise<TimeRangeStats>
  aggregateErrors(): Promise<ErrorStats[]>
}
```

**职责**:
- 执行 SQL 查询
- 管理数据库连接
- 处理数据库异常

### 4. 中间件 (Middleware)

#### ValidationMiddleware
验证请求数据。

**功能**:
- 使用 Joi schema 验证请求体
- 验证查询参数
- 返回详细的验证错误信息

#### ErrorMiddleware
统一错误处理。

**功能**:
- 捕获所有未处理的异常
- 格式化错误响应
- 记录错误日志
- 返回适当的 HTTP 状态码

#### LoggingMiddleware
记录请求日志。

**功能**:
- 记录请求时间、方法、路径
- 记录响应状态码和耗时
- 使用 Winston 输出日志

## 数据模型

### Log 表结构

```sql
CREATE TABLE logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  device_uuid VARCHAR(36) NOT NULL,
  data_type ENUM('record', 'warning', 'error') NOT NULL,
  log_key VARCHAR(255) NOT NULL,
  log_value JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device_uuid (device_uuid),
  INDEX idx_data_type (data_type),
  INDEX idx_created_at (created_at),
  INDEX idx_device_type (device_uuid, data_type),
  INDEX idx_device_time (device_uuid, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Sequelize 模型定义

```javascript
const Log = sequelize.define('Log', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  deviceUuid: {
    type: DataTypes.STRING(36),
    allowNull: false,
    field: 'device_uuid'
  },
  dataType: {
    type: DataTypes.ENUM('record', 'warning', 'error'),
    allowNull: false,
    field: 'data_type'
  },
  logKey: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'log_key'
  },
  logValue: {
    type: DataTypes.JSON,
    allowNull: false,
    field: 'log_value'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'logs',
  timestamps: false
});
```

### 数据传输对象 (DTOs)

#### LogInput
```typescript
interface LogInput {
  deviceUuid: string;      // UUID 格式
  dataType: 'record' | 'warning' | 'error';
  key: string;
  value: object;           // 任意 JSON 对象
}
```

#### LogOutput
```typescript
interface LogOutput {
  id: number;
  deviceUuid: string;
  dataType: string;
  key: string;
  value: object;
  createdAt: string;       // ISO 8601 格式
}
```

#### LogFilters
```typescript
interface LogFilters {
  deviceUuid?: string;
  dataType?: 'record' | 'warning' | 'error';
  startTime?: Date;
  endTime?: Date;
}
```

#### Pagination
```typescript
interface Pagination {
  page: number;            // 从 1 开始
  pageSize: number;        // 默认 20，最大 100
}
```

#### PaginatedResult
```typescript
interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

#### DeviceReport
```typescript
interface DeviceReport {
  deviceUuid: string;
  totalLogs: number;
  recordCount: number;
  warningCount: number;
  errorCount: number;
  firstLogTime: string;
  lastLogTime: string;
}
```

#### TimeRangeReport
```typescript
interface TimeRangeReport {
  startTime: string;
  endTime: string;
  totalLogs: number;
  recordCount: number;
  warningCount: number;
  errorCount: number;
  deviceCount: number;
}
```

#### ErrorReport
```typescript
interface ErrorReport {
  errors: Array<{
    deviceUuid: string;
    key: string;
    count: number;
    lastOccurrence: string;
  }>;
  totalErrors: number;
}
```

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*


### 属性 1：有效日志数据的往返一致性

*对于任意*有效的日志数据（包含有效的 UUID、数据类型、key 和 value），当通过 API 创建日志后再查询该日志，返回的日志数据应该与原始输入数据等价（除了系统生成的 id 和 timestamp 字段）。

**验证需求：1.1, 5.2**

### 属性 2：时间戳自动生成

*对于任意*创建的日志记录，系统应该自动生成 createdAt 时间戳，且该时间戳应该在请求发送时间的合理范围内（例如前后 5 秒）。

**验证需求：1.2**

### 属性 3：输入验证拒绝无效数据

*对于任意*无效的日志输入（缺少必需字段、value 不是有效 JSON、或 dataType 不在允许的枚举值中），API 应该拒绝该请求并返回 4xx 错误状态码和描述性错误信息。

**验证需求：1.3, 1.4, 1.5**

### 属性 4：查询过滤正确性

*对于任意*查询过滤条件组合（设备 UUID、数据类型、时间范围），返回的所有日志记录都应该满足所有指定的过滤条件，且数据库中满足条件的日志都应该被返回。

**验证需求：2.1, 2.2, 2.3, 2.4**

### 属性 5：分页一致性

*对于任意*有效的分页参数（页码和页面大小），返回的日志数量应该不超过指定的页面大小，且遍历所有页面应该返回所有符合条件的日志记录，无重复无遗漏。

**验证需求：2.5**

### 属性 6：统计计算正确性

*对于任意*设备或时间范围，生成的统计报表中的计数（总数、各类型数量）应该与实际数据库中符合条件的日志记录数量完全一致。

**验证需求：3.1, 3.2, 3.3**

### 属性 7：报表 JSON 格式有效性

*对于任意*生成的报表，返回的数据应该是有效的 JSON 格式，且包含所有必需的字段。

**验证需求：3.4**

### 属性 8：错误响应标准化

*对于任意*导致错误的 API 请求，返回的错误响应应该包含标准化的结构（错误码、错误消息），且 HTTP 状态码应该与错误类型匹配（400 用于客户端错误，500 用于服务器错误）。

**验证需求：8.1**

### 属性 9：错误日志记录完整性

*对于任意*系统内部异常或数据库操作失败，系统应该在日志文件中记录包含错误详情的日志条目。

**验证需求：8.2, 8.4**

### 属性 10：访问日志记录完整性

*对于任意*API 请求，系统应该记录包含请求时间、HTTP 方法、路径和响应状态码的访问日志条目。

**验证需求：8.3**

### 属性 11：并发请求处理

*对于任意*一组并发的日志创建请求，所有请求都应该成功处理并存储到数据库，不应该因为并发而导致数据丢失或损坏。

**验证需求：9.1**

## 错误处理

### 错误分类

系统定义以下错误类别：

1. **验证错误 (400 Bad Request)**
   - 缺少必需字段
   - 字段格式不正确
   - 枚举值无效
   - JSON 格式错误

2. **资源未找到 (404 Not Found)**
   - 查询的日志 ID 不存在

3. **服务器错误 (500 Internal Server Error)**
   - 数据库连接失败
   - 数据库操作异常
   - 未预期的系统异常

### 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "人类可读的错误描述",
    "details": {
      "field": "具体的错误详情（可选）"
    }
  }
}
```

### 错误码定义

- `VALIDATION_ERROR`: 请求数据验证失败
- `MISSING_FIELD`: 缺少必需字段
- `INVALID_FORMAT`: 字段格式不正确
- `INVALID_ENUM`: 枚举值无效
- `INVALID_JSON`: JSON 格式错误
- `NOT_FOUND`: 资源不存在
- `DATABASE_ERROR`: 数据库操作失败
- `INTERNAL_ERROR`: 内部服务器错误

### 异常处理策略

1. **验证层**：使用 Joi 进行请求验证，捕获验证错误并转换为标准错误响应
2. **服务层**：捕获业务逻辑异常，记录日志并抛出自定义异常
3. **数据访问层**：捕获数据库异常，记录详细错误信息并抛出数据库异常
4. **全局错误处理器**：捕获所有未处理的异常，记录错误日志，返回标准化错误响应

### 日志记录策略

使用 Winston 进行日志记录，定义以下日志级别：

- **error**: 系统错误、数据库错误、未捕获异常
- **warn**: 验证失败、资源未找到
- **info**: API 请求、重要业务操作
- **debug**: 详细的调试信息（仅开发环境）

日志格式：
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "error",
  "message": "错误描述",
  "context": {
    "requestId": "uuid",
    "userId": "user-id",
    "error": "错误堆栈"
  }
}
```

## 测试策略

### 双重测试方法

系统采用单元测试和基于属性的测试相结合的方法，以确保全面的代码覆盖和正确性验证。

#### 单元测试

单元测试专注于：
- **具体示例**：验证特定输入产生预期输出
- **边缘情况**：空数据、边界值、特殊字符
- **错误条件**：无效输入、数据库错误、网络超时
- **集成点**：组件之间的交互

**测试框架**：Jest
**覆盖目标**：
- 语句覆盖率 > 80%
- 分支覆盖率 > 75%
- 函数覆盖率 > 90%

**单元测试示例**：
```javascript
describe('LogService', () => {
  test('应该拒绝缺少 deviceUuid 的日志', async () => {
    const invalidLog = {
      dataType: 'record',
      key: 'test',
      value: { data: 'test' }
    };
    await expect(logService.createLog(invalidLog))
      .rejects.toThrow('deviceUuid is required');
  });

  test('应该正确处理空查询结果', async () => {
    const result = await logService.queryLogs({ deviceUuid: 'non-existent' });
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });
});
```

#### 基于属性的测试

基于属性的测试验证通用属性在所有输入下都成立。

**测试框架**：fast-check
**配置**：每个属性测试运行最少 100 次迭代

**属性测试要求**：
- 每个正确性属性必须对应一个属性测试
- 每个测试必须使用注释标记引用设计文档中的属性
- 标记格式：`// Feature: hardware-log-system, Property N: [属性标题]`

**属性测试示例**：
```javascript
const fc = require('fast-check');

describe('Property-Based Tests', () => {
  // Feature: hardware-log-system, Property 1: 有效日志数据的往返一致性
  test('创建后查询应返回等价的日志数据', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          deviceUuid: fc.uuid(),
          dataType: fc.constantFrom('record', 'warning', 'error'),
          key: fc.string({ minLength: 1, maxLength: 255 }),
          value: fc.jsonValue()
        }),
        async (logInput) => {
          const created = await logService.createLog(logInput);
          const retrieved = await logService.getLogById(created.id);
          
          expect(retrieved.deviceUuid).toBe(logInput.deviceUuid);
          expect(retrieved.dataType).toBe(logInput.dataType);
          expect(retrieved.key).toBe(logInput.key);
          expect(retrieved.value).toEqual(logInput.value);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: hardware-log-system, Property 4: 查询过滤正确性
  test('查询结果应满足所有过滤条件', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          deviceUuid: fc.uuid(),
          dataType: fc.constantFrom('record', 'warning', 'error')
        }),
        async (filters) => {
          const results = await logService.queryLogs(filters);
          
          results.data.forEach(log => {
            if (filters.deviceUuid) {
              expect(log.deviceUuid).toBe(filters.deviceUuid);
            }
            if (filters.dataType) {
              expect(log.dataType).toBe(filters.dataType);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 集成测试

集成测试验证组件之间的交互：
- API 端点与数据库的集成
- 中间件链的正确执行
- 错误处理流程的端到端验证

**工具**：Supertest + Jest
**环境**：使用 Docker 容器运行测试数据库

### 测试数据管理

- 使用工厂模式生成测试数据
- 每个测试使用独立的数据库事务，测试后回滚
- 使用 faker.js 生成随机但真实的测试数据

### CI/CD 中的测试

- **CI 阶段**：运行所有单元测试、属性测试和集成测试
- **测试失败**：阻止构建和部署
- **覆盖率报告**：生成并上传到代码覆盖率服务
- **性能测试**：定期运行性能基准测试

## 配置管理

### 环境变量

系统通过环境变量进行配置：

```bash
# 服务器配置
NODE_ENV=production          # 运行环境：development, production, test
PORT=3000                    # API 服务端口

# 数据库配置
DB_HOST=localhost            # 数据库主机
DB_PORT=3306                 # 数据库端口
DB_NAME=hardware_logs        # 数据库名称
DB_USER=root                 # 数据库用户
DB_PASSWORD=password         # 数据库密码
DB_POOL_MIN=2                # 连接池最小连接数
DB_POOL_MAX=10               # 连接池最大连接数

# 日志配置
LOG_LEVEL=info               # 日志级别：error, warn, info, debug
LOG_FILE=logs/app.log        # 日志文件路径

# API 配置
API_PREFIX=/api              # API 路径前缀
MAX_PAGE_SIZE=100            # 最大分页大小
DEFAULT_PAGE_SIZE=20         # 默认分页大小
```

### 配置验证

应用启动时验证所有必需的环境变量：
- 缺少必需配置时抛出错误并终止启动
- 记录配置信息（敏感信息脱敏）
- 验证配置值的有效性（端口范围、数据库连接等）

## 部署架构

### Docker 配置

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# 启动应用
CMD ["node", "src/index.js"]
```

#### docker-compose.yml（开发环境）
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=hardware_logs
      - DB_USER=root
      - DB_PASSWORD=password
    depends_on:
      - mysql
    volumes:
      - ./logs:/app/logs

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=hardware_logs
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

### CI/CD 流程

#### GitHub Actions 工作流

**.github/workflows/ci-cd.yml**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: hardware_logs_test
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
        env:
          DB_HOST: localhost
          DB_PORT: 3306
          DB_NAME: hardware_logs_test
          DB_USER: root
          DB_PASSWORD: password
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DB_HOST: localhost
          DB_PORT: 3306
          DB_NAME: hardware_logs_test
          DB_USER: root
          DB_PASSWORD: password
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Registry
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/hardware-log-system:latest
            ${{ secrets.DOCKER_USERNAME }}/hardware-log-system:${{ github.sha }}
          cache-from: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/hardware-log-system:buildcache
          cache-to: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/hardware-log-system:buildcache,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/hardware-log-system
            docker-compose pull
            docker-compose up -d
            docker-compose ps
```

### 部署步骤

1. **代码推送**：开发者推送代码到 GitHub
2. **CI 触发**：GitHub Actions 自动触发 CI 流程
3. **测试执行**：运行 linter、单元测试、集成测试
4. **镜像构建**：测试通过后构建 Docker 镜像
5. **镜像推送**：推送镜像到 Docker Registry
6. **自动部署**：SSH 连接到服务器，拉取新镜像并重启容器
7. **健康检查**：验证新版本正常运行
8. **回滚机制**：如果健康检查失败，自动回滚到上一版本

### 监控和日志

- **应用日志**：使用 Winston 记录到文件和控制台
- **访问日志**：记录所有 API 请求
- **错误追踪**：集成 Sentry 或类似服务
- **性能监控**：使用 PM2 或 New Relic 监控应用性能
- **数据库监控**：监控数据库连接池、查询性能

## 安全考虑

### 输入验证
- 所有 API 输入使用 Joi 进行严格验证
- 防止 SQL 注入：使用 Sequelize ORM 参数化查询
- 防止 XSS：对输出进行适当转义

### 认证和授权
- 预留认证中间件接口（未来可集成 JWT 或 OAuth）
- API 密钥验证（可选）

### 数据安全
- 数据库连接使用 SSL/TLS
- 敏感配置信息使用环境变量
- 日志中脱敏敏感信息

### 速率限制
- 使用 express-rate-limit 防止 API 滥用
- 针对不同端点设置不同的速率限制

### CORS 配置
- 配置允许的源
- 限制允许的 HTTP 方法
- 设置适当的 CORS 头

## 性能优化

### 数据库优化
- 使用索引优化查询性能
- 使用连接池管理数据库连接
- 对大结果集使用分页
- 定期分析慢查询并优化

### 应用优化
- 使用 Node.js 集群模式利用多核 CPU
- 实现响应缓存（Redis）用于频繁查询
- 使用压缩中间件减少响应大小
- 异步处理非关键操作

### 监控指标
- 响应时间：P50, P95, P99
- 吞吐量：每秒请求数
- 错误率：4xx 和 5xx 错误比例
- 数据库连接池使用率
- 内存和 CPU 使用率
