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
import { 
  loggingMiddleware, 
  errorHandler, 
  notFoundHandler,
  apiLimiter,
  requestIdMiddleware,
} from './middleware';
import { logger } from './config/logger';

/**
 * 创建并配置 Express 应用
 */
export function createApp(): Application {
  const app = express();

  // 信任代理（用于获取真实 IP）
  app.set('trust proxy', 1);

  // 请求 ID 追踪（最先执行）
  app.use(requestIdMiddleware);

  // 基础中间件
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 请求日志中间件
  app.use(loggingMiddleware);

  // 健康检查端点（不限流）
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // API 限流（应用于所有 /api 路由）
  app.use('/api', apiLimiter);

  // API v1 路由
  app.use('/api/v1/logs', logRoutes);
  app.use('/api/v1/reports', reportRoutes);

  // 兼容旧路由（重定向到 v1）
  app.use('/api/logs', logRoutes);
  app.use('/api/reports', reportRoutes);

  // 404 处理
  app.use(notFoundHandler);

  // 全局错误处理中间件
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
