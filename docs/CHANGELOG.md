# 更新日志

## 2026-03-04

### 新增功能

#### 1. 项目管理页面 - 查看日志链接
- 在项目列表的操作列添加了"查看日志"按钮
- 点击按钮可在新标签页中直接打开对应项目的日志报表页面
- 按钮样式：蓝色背景，带有📊图标
- 链接格式：`/session.html?projectId={项目ID}`

#### 2. 原始日志导出功能
- 在会话报表页面（session.html）添加了"原始数据"导出按钮
- 支持导出指定日期范围内的所有原始日志
- 导出格式：Excel文件，包含所有日志字段
- 日志按创建时间升序排序
- 支持多语言列名（简体中文、繁体中文、英文）

#### 3. 测试数据生成脚本
- 创建了两个测试数据生成脚本：
  - `scripts/generate-test-data.ts` - 直接数据库方式（推荐）
  - `scripts/generate-test-data-api.ts` - 通过HTTP API方式
- 自动生成3个测试项目，每个项目包含多个会话和日志
- 支持用户名字段，每个项目有不同的用户列表
- 包含完整的列名映射配置

### 改进

#### 数据库
- 手动执行所有迁移文件，确保表结构完整
- 验证了 `user_name` 字段的正确性
- 修复了迁移脚本的执行问题

#### 测试数据
- 更新测试数据生成脚本，使用项目名称而不是ID来匹配配置
- 为每个项目定义了不同的用户名列表：
  - 智能家居系统：张三、李四、王五、赵六
  - 工业传感器网络：操作员A、操作员B、操作员C
  - 车联网平台：司机甲、司机乙、司机丙
- 每个会话随机分配一个用户名

#### 文档
- 创建了快速开始指南（docs/QUICK_START.md）
- 创建了测试数据生成指南（docs/TEST_DATA_GENERATION.md）
- 添加了详细的使用说明和常见问题解答

### 技术细节

#### 前端更新
- `public/js/app.js`: 更新 `updateProjectsTable()` 函数，添加查看日志链接
- `public/index.html`: 调整项目管理页面表格列宽
- `public/js/session.js`: 添加 `exportRawLogsToExcel()` 函数
- `public/js/i18n.js`: 添加原始数据导出的多语言支持

#### 后端更新
- `src/routes/SessionRoutes.ts`: 添加 `/sessions/reports/raw-logs` API端点
- `src/services/SessionService.ts`: 实现 `getProjectRawLogs()` 方法

#### 脚本更新
- `scripts/generate-test-data.ts`: 添加用户名支持，使用项目名称匹配
- `scripts/README.md`: 脚本使用说明
- `docs/TEST_DATA_GENERATION.md`: 完整的测试数据生成指南

### 测试

所有功能已通过测试：
- ✅ 项目管理页面正确显示查看日志链接
- ✅ 点击链接在新标签页打开正确的报表页面
- ✅ 原始日志导出功能正常工作
- ✅ 测试数据生成脚本成功创建数据
- ✅ 用户名字段正确保存和显示
- ✅ 列名映射配置正确应用

### 访问地址

- 项目列表：http://localhost:3000/#projects
- 项目报表示例：http://localhost:3000/session.html?projectId=10
- API文档：http://localhost:3000/api-docs

### 下一步计划

- [ ] 添加批量导出功能
- [ ] 支持自定义导出字段
- [ ] 添加数据可视化图表
- [ ] 实现实时日志监控
- [ ] 添加日志搜索和过滤功能
