/**
 * MetricsMiddleware - HTTP 请求监控中间件
 */

import { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDuration } from '../config/metrics';

/**
 * 记录 HTTP 请求指标
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // 响应完成时记录指标
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const path = normalizePath(req.route?.path || req.path);
    const labels = {
      method: req.method,
      path,
      status: res.statusCode.toString(),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });

  next();
}

/**
 * 规范化路径，将动态参数替换为占位符
 */
function normalizePath(path: string): string {
  // 将 UUID 替换为 :uuid
  let normalized = path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':uuid'
  );
  // 将数字 ID 替换为 :id
  normalized = normalized.replace(/\/\d+/g, '/:id');
  return normalized;
}
