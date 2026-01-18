/**
 * 服务器启动脚本
 * 
 * 验证环境变量、测试数据库连接、启动 HTTP 服务器
 * 
 * 需求：5.1, 5.4
 */

import dotenv from 'dotenv';
import { createApp, setupGracefulShutdown } from './app';
import { sequelize } from './config/database';
import { validateEnv } from './config/env';
import { logger } from './config/logger';

// 加载环境变量
dotenv.config();

/**
 * 启动服务器
 */
async function startServer(): Promise<void> {
  try {
    // 验证环境变量配置
    logger.info('验证环境变量配置...');
    validateEnv();
    logger.info('环境变量验证通过');

    // 测试数据库连接（需求 5.1, 5.4）
    logger.info('测试数据库连接...');
    await sequelize.authenticate();
    logger.info('数据库连接成功', {
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
    });

    // 创建 Express 应用
    const app = createApp();

    // 获取端口配置
    const port = parseInt(process.env.PORT || '3000', 10);

    // 启动 HTTP 服务器
    const server = app.listen(port, () => {
      logger.info('服务器启动成功', {
        port,
        env: process.env.NODE_ENV || 'development',
        pid: process.pid,
      });
      logger.info(`服务器地址: http://localhost:${port}`);
      logger.info(`健康检查: http://localhost:${port}/health`);
    });

    // 设置优雅关闭
    setupGracefulShutdown(server);
  } catch (error) {
    logger.error('服务器启动失败', {
      error: error instanceof Error ? error.message : '未知错误',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error: Error) => {
  logger.error('未捕获的异常', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (reason: any) => {
  logger.error('未处理的 Promise 拒绝', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

// 启动服务器
startServer();
