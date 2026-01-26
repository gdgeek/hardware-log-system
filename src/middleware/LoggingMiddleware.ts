/**
 * LoggingMiddleware - 请求日志记录中间件
 *
 * 记录所有 API 请求的访问日志，包含请求时间、方法、路径、响应状态码和耗时
 *
 * 需求：8.3
 */

import { Request, Response, NextFunction } from "express";
import { logRequest } from "../config/logger";

/**
 * 请求日志记录中间件
 *
 * 记录每个 HTTP 请求的详细信息
 */
export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();

  // 保存原始的 res.json 方法
  const originalJson = res.json.bind(res);

  // 重写 res.json 方法以捕获响应
  res.json = function (body: unknown): Response {
    const duration = Date.now() - startTime;

    // 记录请求日志（需求 8.3）
    logRequest(req.method, req.path, res.statusCode, duration, {
      requestId: (req as Request & { requestId?: string }).requestId,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      userAgent: req.get("user-agent"),
      ip: req.ip || req.socket.remoteAddress,
    });

    return originalJson(body);
  };

  // 监听响应完成事件（用于非 JSON 响应）
  res.on("finish", () => {
    // 只在没有调用 json 方法时记录
    if (res.json === originalJson) {
      const duration = Date.now() - startTime;
      logRequest(req.method, req.path, res.statusCode, duration, {
        requestId: (req as Request & { requestId?: string }).requestId,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        userAgent: req.get("user-agent"),
        ip: req.ip || req.socket.remoteAddress,
      });
    }
  });

  next();
}
