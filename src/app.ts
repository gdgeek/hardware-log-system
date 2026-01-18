/**
 * Express 应用主文件
 * 
 * 初始化 Express 应用，注册中间件和路由
 * 
 * 需求：8.1, 8.2, 8.3
 */

import express, { Application } from 'express';
import cors from 'cors';
import { logRoutes, reportRoutes } from './routes';
import { loggingMiddleware, errorHandler, notFoundHandler } from './middleware';
import { logger } from './config/logger';

/**
 * 创建并配置 Express 应用
 */
export function createApp(): Application {
  const app = express();

  // 基础中间件
  app.use(cors()); // CORS 支持
  app.use(express.json()); // JSON 请求体解析
  app.use(express.urlencoded({ extended: true })); // URL 编码请求体解析

  // 请求日志中间件（需求 8.3）
  app.use(loggingMiddleware);

  // 健康检查端点
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // API 路由
  app.use('/api/logs', logRoutes);
  app.use('/api/reports', reportRoutes);

  // 404 处理（在所有路由之后）
  app.use(notFoundHandler);

  // 全局错误处理中间件（需求 8.1, 8.2）
  app.use(errorHandler);

  logger.info('Express 应用初始化完成');

  return app;
}

/**
 * 优雅关闭处理
 */
export function setupGracefulShutdown(server: { close: (callback: () => void) => void }): void {
  const shutdown = async (signal: string) => {
    logger.info(`收到 ${signal} 信号，开始优雅关闭...`);

    server.close(() => {
      logger.info('HTTP 服务器已关闭');
      process.exit(0);
    });

    // 设置超时，强制退出
    setTimeout(() => {
      logger.error('无法在规定时间内优雅关闭，强制退出');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
