/**
 * ErrorMiddleware 单元测试
 */

import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler, asyncHandler } from './ErrorMiddleware';
import { ValidationError, NotFoundError, DatabaseError } from '../types';

// Mock logger
jest.mock('../config/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
  logError: jest.fn(),
}));

describe('ErrorMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      path: '/test',
      method: 'POST',
      query: {},
      body: {},
      params: {},
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
      headersSent: false,
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('errorHandler', () => {
    it('应该处理 ValidationError 并返回 400', () => {
      const error = new ValidationError('验证失败', 'VALIDATION_ERROR', {
        errors: [{ field: 'name', message: '名称必填' }],
      });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: '验证失败',
          details: {
            errors: [{ field: 'name', message: '名称必填' }],
          },
        },
      });
    });

    it('应该处理 NotFoundError 并返回 404', () => {
      const error = new NotFoundError('资源未找到');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: '资源未找到',
        },
      });
    });

    it('应该处理 DatabaseError 并返回 500', () => {
      const error = new DatabaseError('数据库连接失败', 'DATABASE_ERROR');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'DATABASE_ERROR',
          message: '数据库操作失败',
        },
      });
    });

    it('应该处理未知错误并返回 500', () => {
      const error = new Error('未知错误');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: expect.any(String),
        },
      });
    });

    it('应该在响应已发送时调用 next', () => {
      mockResponse.headersSent = true;
      const error = new Error('测试错误');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('应该返回标准化的错误响应格式', () => {
      const error = new ValidationError('测试错误');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const errorResponse = jsonMock.mock.calls[0][0];
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse.error).toHaveProperty('code');
      expect(errorResponse.error).toHaveProperty('message');
    });

    it('应该在生产环境隐藏错误详情', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('敏感错误信息');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const errorResponse = jsonMock.mock.calls[0][0];
      expect(errorResponse.error.message).toBe('服务器内部错误');

      process.env.NODE_ENV = originalEnv;
    });

    it('应该在开发环境显示错误详情', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('详细错误信息');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const errorResponse = jsonMock.mock.calls[0][0];
      expect(errorResponse.error.message).toBe('详细错误信息');

      process.env.NODE_ENV = originalEnv;
    });

    it('应该包含 ValidationError 的详细信息', () => {
      const error = new ValidationError('验证失败', 'VALIDATION_ERROR', {
        errors: [
          { field: 'email', message: '邮箱格式无效' },
          { field: 'age', message: '年龄必须大于 0' },
        ],
      });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const errorResponse = jsonMock.mock.calls[0][0];
      expect(errorResponse.error.details).toBeDefined();
      expect(errorResponse.error.details.errors).toHaveLength(2);
    });
  });

  describe('notFoundHandler', () => {
    it('应该返回 404 错误', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: expect.stringContaining('路由未找到'),
        },
      });
    });

    it('应该在错误消息中包含请求路径和方法', () => {
      mockRequest = {
        path: '/api/test',
        method: 'GET',
        query: {},
        body: {},
        params: {},
      };

      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      const errorResponse = jsonMock.mock.calls[0][0];
      expect(errorResponse.error.message).toContain('GET');
      expect(errorResponse.error.message).toContain('/api/test');
    });
  });

  describe('asyncHandler', () => {
    it('应该处理成功的异步函数', async () => {
      const asyncFn = jest.fn().mockResolvedValue(undefined);
      const handler = asyncHandler(asyncFn);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFn).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该捕获异步函数中的错误', async () => {
      const error = new Error('异步错误');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const handler = asyncHandler(asyncFn);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFn).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('应该捕获 Promise 拒绝', async () => {
      const error = new ValidationError('验证错误');
      const asyncFn = async () => {
        throw error;
      };
      const handler = asyncHandler(asyncFn);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('应该传递请求、响应和 next 给异步函数', async () => {
      const asyncFn = jest.fn().mockResolvedValue(undefined);
      const handler = asyncHandler(asyncFn);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
    });
  });

  describe('错误响应一致性', () => {
    it('所有错误类型应该返回一致的响应结构', () => {
      const errors = [
        new ValidationError('验证错误'),
        new NotFoundError('未找到'),
        new DatabaseError('数据库错误'),
        new Error('通用错误'),
      ];

      errors.forEach((error) => {
        jsonMock.mockClear();
        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        const errorResponse = jsonMock.mock.calls[0][0];
        expect(errorResponse).toHaveProperty('error');
        expect(errorResponse.error).toHaveProperty('code');
        expect(errorResponse.error).toHaveProperty('message');
        expect(typeof errorResponse.error.code).toBe('string');
        expect(typeof errorResponse.error.message).toBe('string');
      });
    });
  });
});
