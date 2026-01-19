/**
 * RateLimitMiddleware 单元测试
 */

import { apiLimiter, strictLimiter } from './RateLimitMiddleware';

// Mock logger
jest.mock('../config/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('RateLimitMiddleware', () => {
  describe('apiLimiter', () => {
    it('should be defined', () => {
      expect(apiLimiter).toBeDefined();
    });

    it('should be a function (middleware)', () => {
      expect(typeof apiLimiter).toBe('function');
    });
  });

  describe('strictLimiter', () => {
    it('should be defined', () => {
      expect(strictLimiter).toBeDefined();
    });

    it('should be a function (middleware)', () => {
      expect(typeof strictLimiter).toBe('function');
    });
  });
});
