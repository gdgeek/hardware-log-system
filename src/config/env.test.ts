/**
 * Unit tests for environment configuration module
 */

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Required environment variables', () => {
    it('should throw error when DB_HOST is missing', () => {
      delete process.env.DB_HOST;
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';

      expect(() => {
        jest.isolateModules(() => {
          require('./env');
        });
      }).toThrow('Required environment variable DB_HOST is not set');
    });

    it('should throw error when DB_NAME is missing', () => {
      process.env.DB_HOST = 'localhost';
      delete process.env.DB_NAME;
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';

      expect(() => {
        jest.isolateModules(() => {
          require('./env');
        });
      }).toThrow('Required environment variable DB_NAME is not set');
    });

    it('should throw error when DB_USER is missing', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      delete process.env.DB_USER;
      process.env.DB_PASSWORD = 'test_pass';

      expect(() => {
        jest.isolateModules(() => {
          require('./env');
        });
      }).toThrow('Required environment variable DB_USER is not set');
    });

    it('should throw error when DB_PASSWORD is missing', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      delete process.env.DB_PASSWORD;

      expect(() => {
        jest.isolateModules(() => {
          require('./env');
        });
      }).toThrow('Required environment variable DB_PASSWORD is not set');
    });
  });

  describe('Default values', () => {
    beforeEach(() => {
      // Set required variables
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
    });

    it('should use default values for optional variables', () => {
      delete process.env.NODE_ENV;
      delete process.env.PORT;
      delete process.env.LOG_LEVEL;

      const { config } = require('./env');

      expect(config.nodeEnv).toBe('development');
      expect(config.port).toBe(3000);
      expect(config.logLevel).toBe('info');
    });

    it('should use environment values when provided', () => {
      process.env.NODE_ENV = 'production';
      process.env.PORT = '8080';
      process.env.LOG_LEVEL = 'debug';

      jest.isolateModules(() => {
        const { config } = require('./env');

        expect(config.nodeEnv).toBe('production');
        expect(config.port).toBe(8080);
        expect(config.logLevel).toBe('debug');
      });
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      // Set required variables
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
    });

    it('should throw error for invalid port number', () => {
      process.env.PORT = '99999';

      expect(() => {
        jest.isolateModules(() => {
          require('./env');
        });
      }).toThrow('PORT must be between 1 and 65535');
    });

    it('should throw error for invalid DB_PORT', () => {
      process.env.DB_PORT = '0';

      expect(() => {
        jest.isolateModules(() => {
          require('./env');
        });
      }).toThrow('DB_PORT must be between 1 and 65535');
    });

    it('should throw error when DB_POOL_MAX < DB_POOL_MIN', () => {
      process.env.DB_POOL_MIN = '10';
      process.env.DB_POOL_MAX = '5';

      expect(() => {
        jest.isolateModules(() => {
          require('./env');
        });
      }).toThrow('DB_POOL_MAX must be >= DB_POOL_MIN');
    });

    it('should throw error for invalid log level', () => {
      process.env.LOG_LEVEL = 'invalid';

      expect(() => {
        jest.isolateModules(() => {
          require('./env');
        });
      }).toThrow('LOG_LEVEL must be one of error, warn, info, debug');
    });

    it('should throw error for non-numeric port', () => {
      process.env.PORT = 'not-a-number';

      expect(() => {
        jest.isolateModules(() => {
          require('./env');
        });
      }).toThrow('Environment variable PORT must be a valid number');
    });
  });

  describe('Configuration loading', () => {
    it('should load valid configuration successfully', () => {
      process.env.NODE_ENV = 'test';
      process.env.PORT = '3000';
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '3306';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';
      process.env.DB_POOL_MIN = '2';
      process.env.DB_POOL_MAX = '10';
      process.env.LOG_LEVEL = 'info';
      process.env.LOG_FILE = 'logs/test.log';
      process.env.API_PREFIX = '/api';
      process.env.MAX_PAGE_SIZE = '100';
      process.env.DEFAULT_PAGE_SIZE = '20';

      jest.isolateModules(() => {
        const { config } = require('./env');

        expect(config).toMatchObject({
          nodeEnv: 'test',
          port: 3000,
          dbHost: 'localhost',
          dbPort: 3306,
          dbName: 'test_db',
          dbUser: 'test_user',
          dbPassword: 'test_pass',
          dbPoolMin: 2,
          dbPoolMax: 10,
          logLevel: 'info',
          logFile: 'logs/test.log',
          apiPrefix: '/api',
          maxPageSize: 100,
          defaultPageSize: 20,
        });
      });
    });
  });
});
