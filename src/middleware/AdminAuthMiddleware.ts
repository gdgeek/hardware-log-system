/**
 * AdminAuthMiddleware - 管理员认证中间件
 * 
 * 验证管理员身份，保护需要认证的路由
 */

import { Request, Response, NextFunction } from 'express';
import { authService, AuthUser } from '../services/AuthService';
import { logger } from '../config/logger';

// 扩展 Request 类型以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * 管理员认证中间件
 */
export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('认证失败：缺少 Authorization header', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: '需要认证'
        }
      });
      return;
    }

    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
    
    const user = authService.verifyToken(token);
    
    if (!authService.isAdmin(user)) {
      logger.warn('认证失败：非管理员用户', {
        userId: user.id,
        username: user.username,
        role: user.role,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: '权限不足'
        }
      });
      return;
    }

    // 将用户信息添加到请求对象
    req.user = user;
    
    logger.debug('认证成功', {
      userId: user.id,
      username: user.username,
      path: req.path,
      method: req.method
    });

    next();
  } catch (error) {
    logger.warn('认证失败：token 验证错误', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: '认证失败'
      }
    });
  }
}