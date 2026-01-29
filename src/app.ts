/**
 * Express 应用主文件
 *
 * 初始化 Express 应用，注册中间件和路由
 *
 * 需求：8.1, 8.2, 8.3
 */

import express, { Application } from "express";
import path from "path";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { logRoutes, reportRoutes, authRoutes, sessionRoutes, projectRoutes } from "./routes";
import {
  loggingMiddleware,
  errorHandler,
  notFoundHandler,
  apiLimiter,
  requestIdMiddleware,
} from "./middleware";
import { metricsMiddleware } from "./middleware/MetricsMiddleware";
import { logger } from "./config/logger";
import { swaggerSpec } from "./config/swagger";
import {
  register,
  dbPoolConnections,
  redisConnectionStatus,
} from "./config/metrics";
import { sequelize } from "./config/database";
import { cacheService } from "./config/redis";

/**
 * 创建并配置 Express 应用
 */
export function createApp(): Application {
  const app = express();

  // 信任代理（用于获取真实 IP）
  app.set("trust proxy", 1);

  // 请求 ID 追踪（最先执行）
  app.use(requestIdMiddleware);

  // 监控中间件
  app.use(metricsMiddleware);

  // 基础中间件
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 请求日志中间件
  app.use(loggingMiddleware);

  // Swagger UI
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "硬件日志管理系统 API",
    }),
  );

  // Swagger JSON
  app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // 健康检查端点（增强版）
  app.get("/health", async (_req, res) => {
    const health: {
      status: string;
      timestamp: string;
      uptime: number;
      version: string;
      checks: {
        database: { status: string; latency?: number; error?: string };
        redis: { status: string; enabled: boolean };
      };
      memory: {
        used: number;
        total: number;
        percentage: number;
      };
    } = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      checks: {
        database: { status: "unknown" },
        redis: {
          status: "unknown",
          enabled: process.env.REDIS_ENABLED === "true",
        },
      },
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
      },
    };

    // 检查数据库连接
    try {
      const dbStart = Date.now();
      await sequelize.authenticate();
      const dbLatency = Date.now() - dbStart;
      health.checks.database = { status: "healthy", latency: dbLatency };

      // 更新数据库连接池指标
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pool = (sequelize.connectionManager as any).pool;
      if (pool) {
        dbPoolConnections.set({ state: "used" }, pool.using);
        dbPoolConnections.set({ state: "idle" }, pool.available);
        dbPoolConnections.set({ state: "waiting" }, pool.waiting);
      }
    } catch (error) {
      health.status = "degraded";
      health.checks.database = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // 检查 Redis 连接
    if (process.env.REDIS_ENABLED === "true") {
      if (cacheService.isAvailable()) {
        health.checks.redis.status = "healthy";
        redisConnectionStatus.set(1);
      } else {
        health.checks.redis.status = "unhealthy";
        redisConnectionStatus.set(0);
        // Redis 不可用不影响整体状态，只是降级
      }
    } else {
      health.checks.redis.status = "disabled";
    }

    // 内存使用情况
    const memUsage = process.memoryUsage();
    health.memory = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    };

    const statusCode = health.status === "ok" ? 200 : 503;
    res.status(statusCode).json(health);
  });

  // Prometheus 指标端点
  app.get("/metrics", async (_req, res) => {
    try {
      res.set("Content-Type", register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      res
        .status(500)
        .end(error instanceof Error ? error.message : "Unknown error");
    }
  });

  // API 限流（应用于所有 /api 路由）
  app.use("/api", apiLimiter);

  // API v1 路由
  app.use("/api/v1/logs", logRoutes);
  app.use("/api/v1/reports", reportRoutes);
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/sessions", sessionRoutes); // 公开接口，无需认证
  app.use("/api/v1/projects", projectRoutes); // 项目管理接口

  // 兼容旧路由（重定向到 v1）
  app.use("/api/logs", logRoutes);
  app.use("/api/reports", reportRoutes);

  // 提供静态资源（UI 管理界面）
  app.use(express.static(path.join(__dirname, "../public")));

  // 支持 SPA 路由：对于非 API 请求返回 index.html
  app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
  });

  // 404 处理
  app.use(notFoundHandler);

  // 全局错误处理中间件
  app.use(errorHandler);

  logger.info("Express 应用初始化完成");

  return app;
}

/**
 * 优雅关闭处理
 */
export function setupGracefulShutdown(server: {
  close: (callback: () => void) => void;
}): void {
  const shutdown = async (signal: string) => {
    logger.info(`收到 ${signal} 信号，开始优雅关闭...`);

    server.close(() => {
      logger.info("HTTP 服务器已关闭");
      process.exit(0);
    });

    // 设置超时，强制退出
    setTimeout(() => {
      logger.error("无法在规定时间内优雅关闭，强制退出");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
