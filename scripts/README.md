# 测试数据生成脚本

## 概述

提供两种方式生成测试数据：

1. **generate-test-data.ts** - 直接操作数据库（需要数据库访问权限）
2. **generate-test-data-api.ts** - 通过 HTTP API 生成（推荐，需要服务运行）

生成的测试数据包括：
- 3个测试项目（智能家居系统、工业传感器网络、车联网平台）
- 每个项目 3-5 个会话
- 每个会话 10-30 条日志
- 日志分布在最近 7 天内
- 包含 record、warning、error 三种类型的日志

## 使用方法

### 方法 1: 通过 API 生成（推荐）

**前提条件**:
- 服务必须正在运行 (`npm run dev` 或 `npm start`)
- 需要配置正确的 AUTH_KEY 环境变量

```bash
# 确保服务正在运行
npm run dev

# 在另一个终端运行
npm run generate-test-data:api
```

### 方法 2: 直接操作数据库

#### 2.1 生成测试数据（保留现有数据）

```bash
npm run generate-test-data
```

这将在现有数据基础上添加新的测试数据。

#### 2.2 清空并重新生成测试数据

```bash
npm run generate-test-data:clear
```

这将先清空所有现有的项目和日志数据，然后生成新的测试数据。

**⚠️ 警告：此操作会删除所有现有数据，请谨慎使用！**

## 生成的数据

### 项目 1: 智能家居系统
- **描述**: 智能家居设备日志收集
- **密码**: 无
- **日志类型**:
  - `device_type`: 温控器、空调、灯光、窗帘
  - `firmware_version`: v1.2.3, v1.2.4, v1.3.0
  - `temperature`: 20-30°C
  - `humidity`: 40-70%
  - `status`: 正常、运行中、待机、离线

### 项目 2: 工业传感器网络
- **描述**: 工业传感器数据采集
- **密码**: test123
- **日志类型**:
  - `sensor_id`: S001, S002, S003, S004
  - `pressure`: 100-150 kPa
  - `flow_rate`: 10-30 L/min
  - `alarm_level`: 0, 1, 2

### 项目 3: 车联网平台
- **描述**: 车载设备数据监控
- **密码**: 无
- **日志类型**:
  - `vehicle_id`: V001, V002, V003
  - `speed`: 0-120 km/h
  - `location`: GPS 坐标
  - `fuel_level`: 0-100%

## 数据特点

1. **时间分布**: 日志分布在最近 7 天内，每个会话的日志按时间顺序排列
2. **日志类型分布**:
   - 90% 为 record（正常记录）
   - 8% 为 warning（警告）
   - 2% 为 error（错误）
3. **会话信息**: 每个会话有唯一的 sessionUuid 和 deviceUuid
4. **客户端信息**: 随机生成客户端 IP 地址和时间戳

## 查看生成的数据

生成数据后，可以通过以下方式查看：

1. **项目列表页面**: http://localhost:3000
2. **项目报表页面**: 
   - 项目 1: http://localhost:3000/session.html?projectId=1
   - 项目 2: http://localhost:3000/session.html?projectId=2
   - 项目 3: http://localhost:3000/session.html?projectId=3

## 注意事项

1. 确保数据库服务正在运行
2. 确保已运行数据库迁移 (`npm run migrate`)
3. 脚本会自动连接到 `.env` 文件中配置的数据库
4. 生成过程可能需要几秒钟，请耐心等待

## 故障排除

### 数据库连接失败
- 检查 `.env` 文件中的数据库配置
- 确保 MySQL 服务正在运行
- 验证数据库用户名和密码是否正确

### 表不存在错误
- 运行 `npm run migrate` 创建数据库表

### 权限错误
- 确保数据库用户有足够的权限创建和修改数据
