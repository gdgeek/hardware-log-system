/**
 * RequestIdMiddleware 单元测试
 */

import { Request, Response } from 'express';
import { requestIdMiddleware } from './RequestIdMiddleware';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-1234-5678-9abc-def012345678'),
}));

// 扩展类型用于测试
interface MockRequest extends Partial<Request> {
  requestId?: string;
}

describe('RequestIdMiddleware', () => {
  let mockReq: MockRequest;
  let mockRes: Partial<Response>;
  let nextFn: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      setHeader: jest.fn(),
    };
    nextFn = jest.fn();
  });

  it('should generate a new request ID when none provided', () => {
    requestIdMiddleware(mockReq as Request, mockRes as Response, nextFn);

    expect(mockReq.requestId).toBeDefined();
    expect(typeof mockReq.requestId).toBe('string');
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', mockReq.requestId);
    expect(nextFn).toHaveBeenCalled();
  });

  it('should use existing X-Request-ID header if provided', () => {
    const existingId = 'existing-request-id-123';
    mockReq.headers = { 'x-request-id': existingId };

    requestIdMiddleware(mockReq as Request, mockRes as Response, nextFn);

    expect(mockReq.requestId).toBe(existingId);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', existingId);
    expect(nextFn).toHaveBeenCalled();
  });

  it('should always call next()', () => {
    requestIdMiddleware(mockReq as Request, mockRes as Response, nextFn);
    expect(nextFn).toHaveBeenCalledTimes(1);
  });

  it('should set response header with the request ID', () => {
    requestIdMiddleware(mockReq as Request, mockRes as Response, nextFn);

    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
  });
});
