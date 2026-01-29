# 项目整理报表日期范围功能

## 功能概述

项目整理报表现在支持日期范围选择，允许用户生成跨多天的综合报表数据。

## 新功能特性

### 1. 日期范围选择
- **开始日期**：选择报表数据的起始日期
- **结束日期**：选择报表数据的结束日期
- **日期验证**：自动验证开始日期不能晚于结束日期

### 2. 快捷日期选择
- **今天**：开始和结束日期都设为今天
- **昨天**：开始和结束日期都设为昨天
- **最近7天**：从7天前到今天
- **最近30天**：从30天前到今天

### 3. 向后兼容
- 支持旧的单日期API参数 `date`
- 新的日期范围API参数 `startDate` 和 `endDate`
- 前端自动适配新旧API格式

## API 更新

### 新的API端点参数

```
GET /api/v1/sessions/reports/project-organization
```

**新参数（推荐）：**
- `projectId`: 项目ID（必需）
- `startDate`: 开始日期，格式 YYYY-MM-DD（必需）
- `endDate`: 结束日期，格式 YYYY-MM-DD（必需）

**旧参数（兼容）：**
- `projectId`: 项目ID（必需）
- `date`: 日期，格式 YYYY-MM-DD（必需）

### 示例请求

```bash
# 新的日期范围请求
curl "http://localhost:8080/api/v1/sessions/reports/project-organization?projectId=1&startDate=2026-01-28&endDate=2026-01-29"

# 旧的单日期请求（仍然支持）
curl "http://localhost:8080/api/v1/sessions/reports/project-organization?projectId=1&date=2026-01-28"
```

### 响应格式更新

```json
{
  "projectId": 1,
  "startDate": "2026-01-28",
  "endDate": "2026-01-29",
  "devices": ["session-uuid-1", "session-uuid-2"],
  "keys": ["temperature", "humidity"],
  "matrix": {
    "session-uuid-1": {
      "temperature": "25.5",
      "humidity": "60.2"
    }
  },
  "sessionInfo": {
    "session-uuid-1": {
      "index": 1,
      "startTime": "2026-01-28T10:00:00.000Z",
      "uuid": "session-uuid-1"
    }
  },
  "totalDevices": 2,
  "totalKeys": 2,
  "totalEntries": 4
}
```

## 前端更新

### 1. 用户界面
- 将单个日期选择器替换为开始/结束日期选择器
- 添加日期范围快捷按钮
- 改进布局以适应新的输入字段

### 2. 验证逻辑
- 客户端日期范围验证
- 友好的错误提示
- 自动日期格式化

### 3. 导出功能
- 文件名包含日期范围信息
- 格式：`项目整理报表_项目{ID}_{开始日期}_至_{结束日期}_{时间戳}.xlsx`
- 单日期时：`项目整理报表_项目{ID}_{日期}_{时间戳}.xlsx`

## 后端更新

### 1. 数据库查询优化
- 支持日期范围查询
- 保持现有的性能特性
- 兼容单日期查询

### 2. 服务层更新
- `SessionService.getProjectOrganizationReport()` 支持日期范围
- `LogRepository.aggregateProjectOrganization()` 支持日期范围
- 保持向后兼容性

### 3. 类型定义更新
```typescript
interface ProjectOrganizationReport {
  projectId: number;
  startDate: string;
  endDate: string;
  // 向后兼容
  date?: string;
  // ... 其他字段
}
```

## 测试覆盖

### 1. 单元测试
- API参数验证测试
- 日期范围逻辑测试
- 向后兼容性测试

### 2. 集成测试
- 完整的CRUD操作测试
- 数据库查询测试
- API端点测试

### 3. 端到端测试
- 前端日期选择测试
- 报表生成测试
- 导出功能测试

### 4. 前端测试
- 导航功能测试
- 模态框功能测试
- Hash路由测试

## 使用指南

### 1. 基本使用
1. 访问 `http://localhost:8080/session.html`
2. 选择项目ID
3. 设置开始和结束日期
4. 点击"生成报表"

### 2. 快捷操作
- 使用快捷按钮快速选择常用日期范围
- 支持键盘导航（Enter键提交）
- 自动日期验证和提示

### 3. 高级功能
- 支持跨月份的日期范围
- 自动处理时区转换
- 智能的会话排序和索引

## 性能考虑

### 1. 查询优化
- 数据库索引优化
- 合理的日期范围限制
- 缓存机制支持

### 2. 前端优化
- 异步数据加载
- 加载状态指示
- 错误处理和重试

### 3. 内存管理
- 大数据集的分页处理
- 适当的数据结构选择
- 垃圾回收优化

## 故障排除

### 常见问题

1. **日期范围过大导致超时**
   - 解决方案：限制日期范围在合理范围内（如30天）

2. **时区问题**
   - 解决方案：确保前后端使用一致的时区处理

3. **数据不一致**
   - 解决方案：检查数据库连接和事务处理

### 调试技巧

1. 检查浏览器开发者工具的网络请求
2. 查看服务器日志中的查询参数
3. 验证数据库中的实际数据范围

## 未来改进

1. **预设日期范围模板**
2. **自定义日期格式支持**
3. **更多的数据聚合选项**
4. **实时数据更新**
5. **批量导出功能**