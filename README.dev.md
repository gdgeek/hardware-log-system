# 开发环境快速启动指南

## 一键启动开发环境 (Docker + Volume挂载)

```bash
# 启动所有服务 (应用、数据库、Redis)
npm run dev:docker

# 查看应用日志
npm run dev:docker:logs

# 重启应用容器 (代码修改后)
npm run dev:docker:restart
```

## 访问地址

- **应用**: http://localhost:3000
- **API文档**: http://localhost:3000/api-docs
- **会话报表**: http://localhost:3000/session.html
- **管理后台**: http://localhost:3000 (密码: admin123)

## 开发特性

✅ **所见即所得**: 修改代码立即生效，容器内自动重启  
✅ **热重载**: 使用 `ts-node --watch` 自动重启  
✅ **Volume挂载**: 本地代码直接挂载到容器，无需重建镜像  
✅ **完整环境**: 应用、数据库、Redis全部在Docker中  
✅ **数据持久化**: 数据库数据保存在Docker volume中  

## 开发工作流

1. **修改代码**: 直接编辑本地文件
2. **自动重启**: 容器内应用自动检测变化并重启
3. **立即测试**: 刷新浏览器看到效果
4. **查看日志**: `npm run dev:docker:logs`

## 常用命令

```bash
# 启动开发环境
npm run dev:docker

# 停止所有服务
npm run dev:docker:down

# 查看应用日志 (实时)
npm run dev:docker:logs

# 重启应用容器
npm run dev:docker:restart

# 查看容器状态
docker-compose -f docker-compose.dev.yml ps

# 进入应用容器
docker exec -it hardware-log-app-dev sh

# 运行测试
npm test
```

## 数据库连接信息

- **Host**: localhost (外部访问) / db (容器内)
- **Port**: 3306
- **Database**: hardware_logs
- **Username**: root
- **Password**: root123

## Redis连接信息

- **Host**: localhost (外部访问) / redis (容器内)
- **Port**: 6379
- **Password**: (无)

## 故障排除

### 应用启动失败
```bash
# 查看应用日志
npm run dev:docker:logs

# 重启应用容器
npm run dev:docker:restart
```

### 数据库连接失败
```bash
# 检查容器状态
docker-compose -f docker-compose.dev.yml ps

# 重启数据库
docker-compose -f docker-compose.dev.yml restart db
```

### 端口占用
```bash
# 停止所有服务
npm run dev:docker:down

# 清理端口
lsof -ti:3000 | xargs kill -9
lsof -ti:3306 | xargs kill -9
```

### 权限问题
```bash
# 修复日志目录权限
mkdir -p logs
chmod 755 logs
```