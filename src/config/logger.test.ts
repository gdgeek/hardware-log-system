/**
 * Unit tests for logger configuration module
 */

import { logger, logError, logRequest, logDatabaseOperation } from './logger';

describe('Logger Configuration', () => {
  // Mock console to avoid cluttering test output
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Logger instance', () => {
    it('should be defined', () => {
      expect(logger).toBeDefined();
    });

    it('should have correct log levels', () => {
      expect(logger.level).toBeDefined();
    });

    it('should log info messages', () => {
      const spy = jest.spyOn(logger, 'info');
      logger.info('Test info message');
      expect(spy).toHaveBeenCalledWith('Test info message');
      spy.mockRestore();
    });

    it('should log error messages', () => {
      const spy = jest.spyOn(logger, 'error');
      logger.error('Test error message');
      expect(spy).toHaveBeenCalledWith('Test error message');
      spy.mockRestore();
    });

    it('should log warn messages', () => {
      const spy = jest.spyOn(logger, 'warn');
      logger.warn('Test warn message');
      expect(spy).toHaveBeenCalledWith('Test warn message');
      spy.mockRestore();
    });
  });

  describe('logError helper', () => {
    it('should log error with context', () => {
      const spy = jest.spyOn(logger, 'error');
      const error = new Error('Test error');
      const context = { userId: '123', action: 'test' };

      logError('Error occurred', error, context);

      expect(spy).toHaveBeenCalledWith('Error occurred', {
        error: {
          message: 'Test error',
          stack: expect.any(String),
          name: 'Error',
        },
        userId: '123',
        action: 'test',
      });

      spy.mockRestore();
    });

    it('should log error without context', () => {
      const spy = jest.spyOn(logger, 'error');
      const error = new Error('Test error');

      logError('Error occurred', error);

      expect(spy).toHaveBeenCalledWith('Error occurred', {
        error: {
          message: 'Test error',
          stack: expect.any(String),
          name: 'Error',
        },
      });

      spy.mockRestore();
    });
  });

  describe('logRequest helper', () => {
    it('should log API request', () => {
      const spy = jest.spyOn(logger, 'info');

      logRequest('GET', '/api/logs', 200, 150);

      expect(spy).toHaveBeenCalledWith('API Request', {
        method: 'GET',
        path: '/api/logs',
        statusCode: 200,
        duration: 150,
      });

      spy.mockRestore();
    });

    it('should log API request with context', () => {
      const spy = jest.spyOn(logger, 'info');
      const context = { userId: '123', ip: '127.0.0.1' };

      logRequest('POST', '/api/logs', 201, 200, context);

      expect(spy).toHaveBeenCalledWith('API Request', {
        method: 'POST',
        path: '/api/logs',
        statusCode: 201,
        duration: 200,
        userId: '123',
        ip: '127.0.0.1',
      });

      spy.mockRestore();
    });
  });

  describe('logDatabaseOperation helper', () => {
    it('should log successful database operation', () => {
      const spy = jest.spyOn(logger, 'log');

      logDatabaseOperation('SELECT', 50, true);

      expect(spy).toHaveBeenCalledWith('info', 'Database Operation', {
        operation: 'SELECT',
        duration: 50,
        success: true,
      });

      spy.mockRestore();
    });

    it('should log failed database operation', () => {
      const spy = jest.spyOn(logger, 'log');

      logDatabaseOperation('INSERT', 100, false, { error: 'Connection failed' });

      expect(spy).toHaveBeenCalledWith('error', 'Database Operation', {
        operation: 'INSERT',
        duration: 100,
        success: false,
        error: 'Connection failed',
      });

      spy.mockRestore();
    });
  });
});
