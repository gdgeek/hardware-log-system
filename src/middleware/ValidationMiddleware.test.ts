/**
 * ValidationMiddleware 单元测试
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { validateRequest, validateBody, validateQuery, validateParams } from './ValidationMiddleware';

// Mock logger
jest.mock('../config/logger');

describe('ValidationMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      body: {},
      query: {},
      params: {},
      path: '/test',
      method: 'POST',
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    const testSchema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().min(0).required(),
    });

    it('应该在数据有效时调用 next', () => {
      mockRequest.body = { name: 'John', age: 30 };

      const middleware = validateRequest(testSchema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('应该在数据无效时返回 400 错误', () => {
      mockRequest.body = { name: 'John' }; // 缺少 age

      const middleware = validateRequest(testSchema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: '请求数据验证失败',
          details: expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: 'age',
              }),
            ]),
          }),
        }),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该收集所有验证错误', () => {
      mockRequest.body = {}; // 缺少所有必需字段

      const middleware = validateRequest(testSchema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      const errorResponse = jsonMock.mock.calls[0][0];
      expect(errorResponse.error.details.errors).toHaveLength(2);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该移除未知字段', () => {
      mockRequest.body = { name: 'John', age: 30, extra: 'field' };

      const middleware = validateRequest(testSchema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body).toEqual({ name: 'John', age: 30 });
      expect(mockRequest.body).not.toHaveProperty('extra');
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该自动转换类型', () => {
      mockRequest.body = { name: 'John', age: '30' }; // age 是字符串

      const middleware = validateRequest(testSchema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.age).toBe(30); // 应该转换为数字
      expect(typeof mockRequest.body.age).toBe('number');
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该验证嵌套对象', () => {
      const nestedSchema = Joi.object({
        user: Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required(),
        }).required(),
      });

      mockRequest.body = {
        user: {
          name: 'John',
          email: 'invalid-email',
        },
      };

      const middleware = validateRequest(nestedSchema, 'body');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      const errorResponse = jsonMock.mock.calls[0][0];
      expect(errorResponse.error.details.errors[0].field).toBe('user.email');
    });
  });

  describe('validateBody', () => {
    it('应该验证请求体', () => {
      const schema = Joi.object({
        title: Joi.string().required(),
      });

      mockRequest.body = { title: 'Test' };

      const middleware = validateBody(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该在请求体无效时返回错误', () => {
      const schema = Joi.object({
        title: Joi.string().required(),
      });

      mockRequest.body = {};

      const middleware = validateBody(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateQuery', () => {
    it('应该验证查询参数', () => {
      const schema = Joi.object({
        page: Joi.number().min(1).default(1),
        limit: Joi.number().min(1).max(100).default(20),
      });

      mockRequest.query = { page: '2', limit: '10' };

      const middleware = validateQuery(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.query).toEqual({ page: 2, limit: 10 });
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该在查询参数无效时返回错误', () => {
      const schema = Joi.object({
        page: Joi.number().min(1).required(),
      });

      mockRequest.query = { page: '0' };

      const middleware = validateQuery(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateParams', () => {
    it('应该验证路径参数', () => {
      const schema = Joi.object({
        id: Joi.number().integer().positive().required(),
      });

      mockRequest.params = { id: '123' };

      const middleware = validateParams(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.params).toEqual({ id: 123 });
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该在路径参数无效时返回错误', () => {
      const schema = Joi.object({
        id: Joi.number().integer().positive().required(),
      });

      mockRequest.params = { id: 'invalid' };

      const middleware = validateParams(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('错误消息格式', () => {
    it('应该返回标准化的错误响应格式', () => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
      });

      mockRequest.body = { email: 'invalid' };

      const middleware = validateBody(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const errorResponse = jsonMock.mock.calls[0][0];
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse.error).toHaveProperty('code');
      expect(errorResponse.error).toHaveProperty('message');
      expect(errorResponse.error).toHaveProperty('details');
      expect(errorResponse.error.details).toHaveProperty('errors');
      expect(Array.isArray(errorResponse.error.details.errors)).toBe(true);
    });

    it('应该包含字段路径和错误消息', () => {
      const schema = Joi.object({
        username: Joi.string().min(3).required(),
      });

      mockRequest.body = { username: 'ab' };

      const middleware = validateBody(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const errorResponse = jsonMock.mock.calls[0][0];
      const error = errorResponse.error.details.errors[0];
      expect(error).toHaveProperty('field');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('type');
      expect(error.field).toBe('username');
    });
  });
});
