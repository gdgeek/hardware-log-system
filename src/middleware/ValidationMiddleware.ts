/**
 * ValidationMiddleware - 请求数据验证中间件
 * 
 * 提供通用的验证中间件工厂函数，用于验证请求体、查询参数和路径参数
 * 
 * 需求：1.3, 1.4, 1.5
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../types';
import { logger } from '../config/logger';

/**
 * 验证目标类型
 */
export type ValidationType = 'body' | 'query' | 'params';

/**
 * 创建验证中间件
 * 
 * @param schema - Joi 验证模式
 * @param type - 验证目标（body, query, params）
 * @returns Express 中间件函数
 */
export function validateRequest(schema: Joi.Schema, type: ValidationType = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dataToValidate = req[type];

    const result = schema.validate(dataToValidate, {
      abortEarly: false, // 收集所有错误
      stripUnknown: true, // 移除未知字段
      convert: true, // 自动类型转换
    });

    if (result.error) {
      const validationError = new ValidationError(
        '请求数据验证失败',
        'VALIDATION_ERROR',
        {
          errors: result.error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
            type: detail.type,
          })),
        }
      );

      logger.warn('请求验证失败', {
        type,
        errors: validationError.details,
        path: req.path,
        method: req.method,
      });

      res.status(400).json({
        error: {
          code: validationError.code,
          message: validationError.message,
          details: validationError.details,
        },
      });
      return;
    }

    // 用验证后的数据替换原始数据
    req[type] = result.value;

    logger.debug('请求验证通过', {
      type,
      path: req.path,
      method: req.method,
    });

    next();
  };
}

/**
 * 验证请求体的中间件工厂函数
 */
export function validateBody(schema: Joi.Schema) {
  return validateRequest(schema, 'body');
}

/**
 * 验证查询参数的中间件工厂函数
 */
export function validateQuery(schema: Joi.Schema) {
  return validateRequest(schema, 'query');
}

/**
 * 验证路径参数的中间件工厂函数
 */
export function validateParams(schema: Joi.Schema) {
  return validateRequest(schema, 'params');
}
