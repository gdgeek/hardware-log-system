# 快速开始指南

本指南帮助你快速启动和测试硬件日志系统。

## 前置条件

- Docker（用于运行 MySQL）
- Node.js 18+ 和 npm
- MySQL 客户端（可选，用于直接查询数据库）

## 1. 启动 MySQL 数据库

确保 MySQL 容器正在运行：

```bash
docker ps | grep xrugc-mysql
```

如果没有运行，启动容器：

```bash
docker start xrugc-mysql
```

## 2. 创建数据库和运行迁移

```bash
# 创建数据库
docker exec xrugc-mysql mysql -uroot -prootpassword -e "CREATE DATABASE IF NOT EXISTS hardware_logs"

# 运行迁移（手动方式）
for file in src/models/migrations/00*.sql; do
  docker exec -i xrugc-mysql mysql -uroot -prootpassword hardware_logs < "$file"
done
```

## 3. 生成测试数据

使用直接数据库方式生成测试数据（推荐，避免速率限制）：

```bash
# 清空现有数据并生成新数据
npm run generate-test-data:clear

# 或者只生成数据（不清空）
npm run generate-test-data
```

这将创建：
- 3个测试项目（智能家居系统、工业传感器网络、车联网平台）
- 每个项目 3-5 个会话
- 每个会话 10-30 条日志
- 总共约 250-300 条日志

## 4. 启动开发服务器

```bash
npm run dev
```

服务器将在 http://localhost:3000 启动。

## 5. 访问系统

### 项目列表页面
打开浏览器访问：http://localhost:3000

你将看到3个测试项目：
- 智能家居系统（无密码）
- 工业传感器网络（密码：test123）
- 车联网平台（无密码）

### 查看项目报表

点击项目卡片上的"查看报表"按钮，或直接访问：

- 智能家居系统：http://localhost:3000/session.html?projectId=10
- 工业传感器网络：http://localhost:3000/session.html?projectId=11（需要输入密码：test123）
- 车联网平台：http://localhost:3000/session.html?projectId=12

注意：项目ID可能不同，请查看实际生成的ID。

### 测试功能

在报表页面，你可以测试：

1. **日期范围选择**：选择不同的日期范围查看数据
2. **会话筛选**：选择特定会话查看详细日志
3. **数据导出**：
   - 导出汇总报表（Excel）
   - 导出原始数据（Excel）
4. **数据可视化**：查看日志类型分布图表
5. **列名映射**：查看自定义的列名显示

## 6. 验证数据

### 通过 API 验证

```bash
# 获取项目列表
curl http://localhost:3000/api/v1/projects | python3 -m json.tool

# 获取项目统计
curl http://localhost:3000/api/v1/projects/10/stats | python3 -m json.tool
```

### 通过数据库验证

```bash
# 查看项目统计
docker exec xrugc-mysql mysql -uroot -prootpassword -e "
  USE hardware_logs;
  SELECT 
    p.id, 
    p.name, 
    COUNT(l.id) as log_count, 
    COUNT(DISTINCT l.session_uuid) as session_count,
    COUNT(DISTINCT l.user_name) as user_count
  FROM projects p 
  LEFT JOIN logs l ON p.id = l.project_id 
  GROUP BY p.id, p.name 
  ORDER BY p.id;
"

# 查看日志类型分布
docker exec xrugc-mysql mysql -uroot -prootpassword -e "
  USE hardware_logs;
  SELECT 
    project_id, 
    data_type, 
    COUNT(*) as count 
  FROM logs 
  GROUP BY project_id, data_type 
  ORDER BY project_id, data_type;
"

# 查看用户名分布
docker exec xrugc-mysql mysql -uroot -prootpassword -e "
  USE hardware_logs;
  SELECT 
    project_id, 
    user_name, 
    COUNT(*) as log_count 
  FROM logs 
  GROUP BY project_id, user_name 
  ORDER BY project_id, user_name;
"
```

## 7. 测试原始日志导出功能

1. 访问任意项目的报表页面
2. 选择日期范围
3. 点击"原始数据"按钮（蓝色按钮）
4. 下载的 Excel 文件将包含所有原始日志，按时间排序

## 常见问题

### 数据库连接失败

确保 MySQL 容器正在运行，并且环境变量配置正确：

```bash
# 检查 .env 文件
cat .env | grep DB_
```

### 项目ID不匹配

每次运行 `generate-test-data:clear` 都会清空数据并重新生成，项目ID会递增。使用项目列表页面查看实际的项目ID。

### 速率限制错误

如果使用 API 方式生成数据遇到速率限制，使用直接数据库方式：

```bash
npm run generate-test-data:clear
```

## 下一步

- 查看 [API 文档](./硬件端API文档.md) 了解如何使用 API
- 查看 [测试数据生成指南](./TEST_DATA_GENERATION.md) 了解更多测试数据选项
- 查看 [README.md](../README.md) 了解完整的系统功能
