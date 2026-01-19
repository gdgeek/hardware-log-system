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
import { config } from './config/env';
import { logger } from './config/logger';

// 加载环境变量
dotenv.config();

/**
 * 数据库连接重试
 * @param maxRetries 最大重试次数
 * @param delay 重试间隔（毫秒）
 */
async function connectWithRetry(maxRetries = 5, delay = 3000): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`数据库连接尝试 ${attempt}/${maxRetries}...`);
      await sequelize.authenticate();
      logger.info('数据库连接成功', {
        host: config.dbHost,
        database: config.dbName,
      });
      return;
    } catch (error) {
      logger.warn(`数据库连接失败 (${attempt}/${maxRetries})`, {
        error: error instanceof Error ? error.message : '未知错误',
      });
      
      if (attempt === maxRetries) {
        throw new Error(`无法连接数据库，已重试 ${maxRetries} 次`);
      }
      
      logger.info(`${delay / 1000} 秒后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * 启动服务器
 */
async function startServer(): Promise<void> {
  try {
    logger.info('环境变量验证通过');

    // 数据库连接（带重试）
    await connectWithRetry();

    // 创建 Express 应用
    const app = createApp();
    const port = config.port;

    // 启动 HTTP 服务器
    const server = app.listen(port, () => {
      logger.info('服务器启动成功', {
        port,
        env: config.nodeEnv,
        pid: process.pid,
      });
      logger.info(`服务器地址: http://localhost:${port}`);
      logger.info(`API v1: http://localhost:${port}/api/v1`);
      logger.info(`健康检查: http://localhost:${port}/health`);
    });

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
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('未处理的 Promise 拒绝', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

// 启动服务器
startServer();
