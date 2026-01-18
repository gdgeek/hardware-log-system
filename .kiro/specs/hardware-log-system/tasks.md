# 实现计划：硬件日志管理系统

## 概述

本实现计划将硬件日志管理系统分解为一系列增量式的编码任务。系统采用三层架构（API 层、业务逻辑层、数据访问层），使用 TypeScript + Express + Sequelize + MySQL 技术栈。每个任务都建立在前一个任务的基础上，确保代码逐步集成，没有孤立的未使用代码。

## 任务列表

- [x] 1. 项目初始化和基础设施搭建
  - 初始化 Node.js 项目，配置 TypeScript
  - 安装核心依赖：express, sequelize, mysql2, joi, winston, swagger-ui-express
  - 配置 tsconfig.json 和项目目录结构（src/routes, src/services, src/repositories, src/models, src/middleware, src/types）
  - 创建环境变量配置模块，验证必需的环境变量
  - 设置 Winston 日志记录器配置
  - _需求：5.1, 8.2, 8.3_

- [x] 2. 数据库层实现
  - [x] 2.1 配置 Sequelize 连接和连接池
    - 创建数据库连接模块，使用环境变量配置
    - 配置连接池参数（min: 2, max: 10）
    - 实现数据库连接测试和错误处理
    - _需求：5.1, 5.4, 9.4_

  - [x] 2.2 定义 Log 数据模型
    - 创建 Sequelize Log 模型，定义表结构和字段
    - 配置索引：device_uuid, data_type, created_at, 复合索引
    - 实现模型验证规则
    - 创建数据库迁移脚本
    - _需求：5.1, 5.3, 9.3_

  - [x] 2.3 实现 LogRepository 数据访问层
    - 实现 create 方法：插入日志记录
    - 实现 findById 方法：根据 ID 查询日志
    - 实现 findByFilters 方法：支持多条件过滤查询
    - 实现 countByFilters 方法：统计符合条件的记录数
    - 实现聚合查询方法：aggregateByDevice, aggregateByTimeRange, aggregateErrors
    - _需求：1.1, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

  - [x] 2.4 编写 LogRepository 的单元测试
    - 测试 create 方法的正常情况和错误情况
    - 测试查询方法的边界条件（空结果、大数据集）
    - 测试聚合方法的计算正确性
    - _需求：5.2, 9.3_

- [ ] 3. 业务逻辑层实现
  - [x] 3.1 实现输入验证模块
    - 使用 Joi 定义 LogInput 验证 schema
    - 验证 UUID 格式、dataType 枚举、key 长度、value JSON 格式
    - 定义查询参数验证 schema（filters, pagination）
    - _需求：1.3, 1.4, 1.5_

  - [x] 3.2 编写输入验证的属性测试
    - **属性 3：输入验证拒绝无效数据**
    - **验证需求：1.3, 1.4, 1.5**

  - [x] 3.3 实现 LogService 业务逻辑
    - 实现 createLog 方法：验证输入、生成时间戳、调用 repository 存储
    - 实现 getLogById 方法：查询单条日志
    - 实现 queryLogs 方法：支持过滤和分页
    - 实现错误处理和业务异常
    - _需求：1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.4 编写 LogService 的属性测试
    - **属性 1：有效日志数据的往返一致性**
    - **验证需求：1.1, 5.2**

  - [x] 3.5 编写 LogService 的属性测试
    - **属性 2：时间戳自动生成**
    - **验证需求：1.2**

  - [x] 3.6 编写 LogService 的属性测试
    - **属性 4：查询过滤正确性**
    - **验证需求：2.1, 2.2, 2.3, 2.4**

  - [x] 3.7 编写 LogService 的属性测试
    - **属性 5：分页一致性**
    - **验证需求：2.5**

  - [x] 3.8 实现 ReportService 报表生成逻辑
    - 实现 generateDeviceReport 方法：设备统计报表
    - 实现 generateTimeRangeReport 方法：时间段统计报表
    - 实现 generateErrorReport 方法：错误统计报表
    - 格式化报表输出为 JSON
    - _需求：3.1, 3.2, 3.3, 3.4_

  - [x] 3.9 编写 ReportService 的属性测试
    - **属性 6：统计计算正确性**
    - **验证需求：3.1, 3.2, 3.3**

  - [x] 3.10 编写 ReportService 的属性测试
    - **属性 7：报表 JSON 格式有效性**
    - **验证需求：3.4**

- [ ] 4. 中间件实现
  - [x] 4.1 实现 ValidationMiddleware
    - 创建通用验证中间件工厂函数
    - 集成 Joi schema 验证
    - 格式化验证错误响应
    - _需求：1.3, 1.4, 1.5_

  - [x] 4.2 实现 ErrorMiddleware
    - 创建全局错误处理中间件
    - 定义错误类型和错误码映射
    - 实现标准化错误响应格式
    - 记录错误日志
    - _需求：8.1, 8.2, 8.4_

  - [~] 4.3 编写 ErrorMiddleware 的属性测试
    - **属性 8：错误响应标准化**
    - **验证需求：8.1**

  - [~] 4.4 编写 ErrorMiddleware 的属性测试
    - **属性 9：错误日志记录完整性**
    - **验证需求：8.2, 8.4**

  - [x] 4.5 实现 LoggingMiddleware
    - 创建请求日志记录中间件
    - 记录请求时间、方法、路径、响应状态码、耗时
    - 集成 Winston 日志输出
    - _需求：8.3_

  - [~] 4.6 编写 LoggingMiddleware 的属性测试
    - **属性 10：访问日志记录完整性**
    - **验证需求：8.3**

- [ ] 5. API 路由层实现
  - [x] 5.1 实现 LogRoutes
    - 创建 POST /api/logs 端点：接收日志数据
    - 创建 GET /api/logs 端点：查询日志（支持过滤和分页）
    - 创建 GET /api/logs/:id 端点：获取单条日志
    - 集成 ValidationMiddleware 验证请求
    - 调用 LogService 处理业务逻辑
    - 格式化响应数据
    - _需求：1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 5.2 实现 ReportRoutes
    - 创建 GET /api/reports/device/:uuid 端点：设备统计报表
    - 创建 GET /api/reports/timerange 端点：时间段统计报表
    - 创建 GET /api/reports/errors 端点：错误统计报表
    - 集成 ValidationMiddleware 验证查询参数
    - 调用 ReportService 生成报表
    - _需求：3.1, 3.2, 3.3, 3.4_

  - [~] 5.3 编写 API 路由的集成测试
    - 使用 Supertest 测试所有端点
    - 测试正常流程和错误情况
    - 验证响应格式和状态码
    - _需求：1.1, 2.1, 3.1_

- [ ] 6. OpenAPI 文档和 Swagger UI
  - [~] 6.1 配置 Swagger 文档
    - 安装 swagger-jsdoc 和 swagger-ui-express
    - 定义 OpenAPI 3.0 规范文档
    - 配置 API 元数据、服务器信息、安全定义
    - _需求：4.1, 4.3_

  - [~] 6.2 为所有端点添加 Swagger 注释
    - 为 LogRoutes 添加 JSDoc 注释
    - 为 ReportRoutes 添加 JSDoc 注释
    - 定义请求体和响应 schema
    - 添加请求和响应示例
    - _需求：4.3, 4.4_

  - [~] 6.3 实现 SwaggerRoutes
    - 创建 GET /api-docs 端点：Swagger UI 界面
    - 创建 GET /api-docs.json 端点：OpenAPI JSON 规范
    - _需求：4.1, 4.2_

- [ ] 7. 应用主入口和服务器配置
  - [x] 7.1 创建 Express 应用主文件
    - 初始化 Express 应用
    - 注册中间件：LoggingMiddleware, express.json(), CORS
    - 注册路由：LogRoutes, ReportRoutes, SwaggerRoutes
    - 注册 ErrorMiddleware（最后）
    - 实现优雅关闭逻辑
    - _需求：8.1, 8.2, 8.3_

  - [x] 7.2 实现服务器启动脚本
    - 验证环境变量配置
    - 测试数据库连接
    - 启动 HTTP 服务器
    - 记录启动日志
    - _需求：5.1, 5.4_

  - [~] 7.3 编写并发处理的属性测试
    - **属性 11：并发请求处理**
    - **验证需求：9.1**

- [~] 8. 检查点 - 确保所有测试通过
  - 运行所有单元测试和属性测试
  - 运行集成测试
  - 检查代码覆盖率
  - 如有问题，请询问用户

- [ ] 9. Docker 容器化
  - [x] 9.1 创建 Dockerfile
    - 使用 Node.js 18 Alpine 基础镜像
    - 配置工作目录和依赖安装
    - 复制应用代码
    - 暴露端口 3000
    - 实现健康检查脚本
    - 定义启动命令
    - _需求：6.1, 6.2, 6.3, 6.4_

  - [x] 9.2 创建 docker-compose.yml
    - 配置应用服务和 MySQL 服务
    - 定义环境变量
    - 配置服务依赖关系
    - 配置数据卷持久化
    - _需求：6.1, 6.3, 6.4_

  - [x] 9.3 创建 .dockerignore 文件
    - 排除 node_modules, logs, .git 等文件
    - _需求：6.2_

- [ ] 10. CI/CD 配置
  - [x] 10.1 创建 GitHub Actions 工作流
    - 配置测试作业：运行 linter、单元测试、集成测试
    - 配置 MySQL 服务容器用于测试
    - 配置构建作业：构建 Docker 镜像
    - 配置部署作业：SSH 部署到服务器
    - _需求：7.1, 7.2, 7.3_

  - [~] 10.2 配置测试脚本
    - 在 package.json 中添加 test:unit, test:integration, test:coverage 脚本
    - 配置 Jest 测试环境
    - 配置代码覆盖率报告
    - _需求：7.2_

  - [~] 10.3 创建部署脚本
    - 创建服务器端的 docker-compose 配置
    - 配置环境变量模板
    - 实现健康检查和回滚逻辑
    - _需求：7.3, 7.4_

- [ ] 11. 文档和配置文件
  - [x] 11.1 创建 README.md
    - 项目简介和功能说明
    - 技术栈和架构说明
    - 本地开发环境搭建指南
    - API 使用示例
    - 部署说明
    - _需求：4.1_

  - [x] 11.2 创建 .env.example
    - 列出所有必需的环境变量
    - 提供示例值和说明
    - _需求：6.3_

  - [~] 11.3 创建数据库迁移文档
    - 数据库表结构说明
    - 迁移脚本使用指南
    - _需求：5.1, 5.3_

- [~] 12. 最终检查点
  - 运行完整的测试套件
  - 验证 Docker 镜像构建成功
  - 验证 API 文档可访问
  - 验证所有环境变量配置正确
  - 如有问题，请询问用户

## 注意事项

- 每个任务都引用了具体的需求编号，确保可追溯性
- 检查点任务确保增量验证
- 属性测试验证通用正确性属性
- 单元测试验证具体示例和边界情况
- 所有代码应该逐步集成，避免孤立的未使用代码
- 所有测试任务都是必需的，确保从一开始就有全面的测试覆盖
