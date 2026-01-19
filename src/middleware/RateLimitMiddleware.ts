/**
 * API 限流中间件
 * 防止 API 滥用和 DDoS 攻击
 */

import rateLimit from 'express-rate-limit';
import { logger } from '../config/logger';

/**
 * 通用 API 限流配置
 * 每个 IP 每分钟最多 100 次请求
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 100, // 每个 IP 最多 100 次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '请求过于频繁，请稍后再试',
    },
  },
  handler: (req, res, _next, options) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json(options.message);
  },
});

/**
 * 严格限流配置（用于写入操作）
 * 每个 IP 每分钟最多 30 次请求
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '写入请求过于频繁，请稍后再试',
    },
  },
  handler: (req, res, _next, options) => {
    logger.warn('Strict rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json(options.message);
  },
});
