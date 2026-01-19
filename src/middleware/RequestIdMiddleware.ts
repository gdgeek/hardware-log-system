/**
 * 请求 ID 追踪中间件
 * 为每个请求生成唯一 ID，便于日志追踪和调试
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * 请求 ID 中间件
 * 为每个请求添加唯一的 requestId
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 优先使用客户端传入的 X-Request-ID，否则生成新的
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  
  // 使用类型断言添加 requestId
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
}
