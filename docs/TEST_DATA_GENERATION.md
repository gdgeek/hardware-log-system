# 测试数据生成指南

## 快速开始

### 推荐方式：通过 API 生成测试数据

这是最简单和最安全的方式，不需要直接访问数据库。

**步骤：**

1. 确保服务正在运行：
```bash
npm run dev
```

2. 在另一个终端窗口运行：
```bash
npm run generate-test-data:api
```

3. 等待脚本完成，你会看到类似输出：
```
开始通过 API 生成测试数据...

创建测试项目...
✓ 创建项目: 智能家居系统 (ID: 1)
✓ 创建项目: 工业传感器网络 (ID: 2)
✓ 创建项目: 车联网平台 (ID: 3)

✓ 创建了 3 个测试项目

为项目 "智能家居系统" (ID: 1) 生成日志...
  ✓ 会话 1/4: 25 条日志
  ✓ 会话 2/4: 18 条日志
  ...

✓ 总共生成了 XXX 条测试日志
```

## 生成的测试数据

### 项目 1: 智能家居系统 🏠
- **ID**: 1
- **密码**: 无
- **数据类型**:
  - `device_type` (设备类型): 温控器、空调、灯光、窗帘
  - `firmware_version` (固件版本): v1.2.3, v1.2.4, v1.3.0
  - `temperature` (温度): 20-30°C
  - `humidity` (湿度): 40-70%
  - `status` (状态): 正常、运行中、待机、离线
  - `error_message`: 连接超时、传感器故障、电源异常
  - `warning_message`: 温度偏高、湿度异常、信号弱

**访问**: http://localhost:3000/session.html?projectId=1

### 项目 2: 工业传感器网络 🏭
- **ID**: 2
- **密码**: test123
- **数据类型**:
  - `sensor_id` (传感器ID): S001, S002, S003, S004
  - `pressure` (压力): 100-150 kPa
  - `flow_rate` (流量): 10-30 L/min
  - `alarm_level` (报警等级): 0, 1, 2
  - `error_code`: E001, E002, E003
  - `warning_code`: W001, W002, W003

**访问**: http://localhost:3000/session.html?projectId=2
**注意**: 需要输入密码 `test123`

### 项目 3: 车联网平台 🚗
- **ID**: 3
- **密码**: 无
- **数据类型**:
  - `vehicle_id` (车辆ID): V001, V002, V003
  - `speed` (速度): 0-120 km/h
  - `location` (位置): GPS 坐标
  - `fuel_level` (油量): 0-100%
  - `error_type`: 引擎故障、刹车异常、GPS失联
  - `warning_type`: 油量低、轮胎压力低、保养提醒

**访问**: http://localhost:3000/session.html?projectId=3

## 数据特征

### 时间分布
- 日志分布在**最近 7 天**内
- 每个会话的日志按时间顺序排列
- 每条日志间隔约 1 分钟

### 日志类型分布
- **90%** 为 `record`（正常记录）
- **8%** 为 `warning`（警告）
- **2%** 为 `error`（错误）

### 会话和日志数量
- 每个项目：**3-5 个会话**
- 每个会话：**10-30 条日志**
- 总计：约 **150-450 条日志**

## 测试场景

### 1. 测试单日报表
```
访问: http://localhost:3000/session.html?projectId=1
选择: 今天的日期
点击: 生成报表
```

### 2. 测试多日报表
```
访问: http://localhost:3000/session.html?projectId=1
选择: 开始日期 = 7天前，结束日期 = 今天
点击: 生成报表
```

### 3. 测试原始数据导出
```
生成报表后，点击工具栏中的 "原始数据" 按钮
验证导出的 Excel 文件包含所有日志字段
```

### 4. 测试密码保护项目
```
访问: http://localhost:3000/session.html?projectId=2
输入密码: test123
验证: 能够正常查看报表
```

### 5. 测试多语言支持
```
访问: http://localhost:3000/session.html?projectId=1&lang=en
验证: 页面显示英文
切换: 点击右上角语言选择器
验证: 简体中文、繁体中文、英文切换正常
```

## 其他生成方式

### 方式 2: 直接操作数据库（需要数据库权限）

```bash
# 保留现有数据，添加新数据
npm run generate-test-data

# 清空所有数据，重新生成
npm run generate-test-data:clear
```

**注意**: 
- 需要正确配置 `.env` 文件中的数据库连接信息
- `generate-test-data:clear` 会删除所有现有数据

## 故障排除

### 问题 1: API 连接失败
**错误**: `创建项目失败: fetch failed`

**解决方案**:
1. 确认服务正在运行: `npm run dev`
2. 检查端口 3000 是否被占用
3. 验证 `.env` 文件中的 `AUTH_KEY` 配置

### 问题 2: 认证失败
**错误**: `Access denied` 或 `Unauthorized`

**解决方案**:
1. 检查 `.env` 文件中的 `AUTH_KEY`
2. 确保脚本使用的 AUTH_KEY 与服务器配置一致

### 问题 3: 数据库连接失败
**错误**: `Access denied for user 'root'@'localhost'`

**解决方案**:
1. 检查 `.env` 文件中的数据库配置
2. 确认 MySQL 服务正在运行
3. 验证数据库用户名和密码
4. 使用 API 方式生成数据（推荐）

### 问题 4: 项目已存在
**提示**: `跳过项目 "智能家居系统": ...`

**说明**: 这是正常的，脚本会跳过已存在的项目，继续生成日志数据

## 清理测试数据

如果需要清理测试数据，可以：

1. **通过管理界面删除**（推荐）:
   - 访问 http://localhost:3000
   - 使用管理员权限删除项目

2. **使用清空脚本**:
```bash
npm run generate-test-data:clear
```
这会删除所有数据并重新生成

3. **手动清理数据库**:
```sql
DELETE FROM logs;
DELETE FROM projects;
```

## 最佳实践

1. **开发环境**: 使用 API 方式生成测试数据
2. **CI/CD**: 在测试环境中使用数据库方式
3. **演示环境**: 定期重新生成测试数据保持新鲜度
4. **生产环境**: 不要运行测试数据生成脚本！

## 相关文档

- [API 文档](../docs/硬件端API文档.md)
- [多语言支持](./MULTILINGUAL_SUPPORT.md)
- [日期范围功能](./DATE_RANGE_FEATURE.md)
