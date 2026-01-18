/**
 * ErrorMiddleware - 全局错误处理中间件
 * 
 * 捕获所有未处理的异常，格式化错误响应，记录错误日志
 * 
 * 需求：8.1, 8.2, 8.4
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError, NotFoundError, DatabaseError } from '../types';
import { logger, logError } from '../config/logger';

/**
 * 错误类型到 HTTP 状态码的映射
 */
const ERROR_STATUS_MAP: Record<string, number> = {
  ValidationError: 400,
  NotFoundError: 404,
  DatabaseError: 500,
};

/**
 * 全局错误处理中间件
 * 
 * @param err - 错误对象
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @param next - Express next 函数
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 如果响应已经发送，传递给默认错误处理器
  if (res.headersSent) {
    next(err);
    return;
  }

  // 确定 HTTP 状态码
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let errorMessage = '服务器内部错误';
  let errorDetails: any = undefined;

  // 处理已知的错误类型
  if (err instanceof ValidationError) {
    statusCode = 400;
    errorCode = err.code;
    errorMessage = err.message;
    errorDetails = err.details;
  } else if (err instanceof NotFoundError) {
    statusCode = 404;
    errorCode = err.code;
    errorMessage = err.message;
  } else if (err instanceof DatabaseError) {
    statusCode = 500;
    errorCode = err.code;
    errorMessage = '数据库操作失败';
    // 不暴露数据库错误详情给客户端
  } else {
    // 未知错误类型
    errorMessage = process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message;
  }

  // 记录错误日志（需求 8.2, 8.4）
  logError('请求处理错误', err, {
    path: req.path,
    method: req.method,
    statusCode,
    errorCode,
    query: req.query,
    body: req.body,
    params: req.params,
  });

  // 返回标准化错误响应（需求 8.1）
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: errorMessage,
      ...(errorDetails && { details: errorDetails }),
    },
  });
}

/**
 * 404 Not Found 处理中间件
 * 
 * 应该在所有路由之后注册
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new NotFoundError(`路由未找到: ${req.method} ${req.path}`);
  
  logger.warn('404 - 路由未找到', {
    path: req.path,
    method: req.method,
  });

  res.status(404).json({
    error: {
      code: error.code,
      message: error.message,
    },
  });
}

/**
 * 异步路由处理器包装函数
 * 
 * 用于包装异步路由处理器，自动捕获 Promise 拒绝
 * 
 * @param fn - 异步路由处理函数
 * @returns 包装后的处理函数
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
