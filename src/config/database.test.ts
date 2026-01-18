import { Sequelize } from 'sequelize';
import { sequelize, testConnection, closeConnection, getPoolStatus, isHealthy } from './database';
import { config } from './env';
import { logger } from './logger';

// Mock the logger to avoid actual logging during tests
jest.mock('./logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  logDatabaseOperation: jest.fn(),
}));

describe('Database Configuration', () => {
  describe('Sequelize Instance', () => {
    it('should create a Sequelize instance with correct configuration', () => {
      expect(sequelize).toBeInstanceOf(Sequelize);
      expect(sequelize.config.database).toBe(config.dbName);
      expect(sequelize.config.host).toBe(config.dbHost);
      expect(sequelize.config.port).toBe(config.dbPort);
      expect(sequelize.config.username).toBe(config.dbUser);
    });

    it('should configure connection pool with correct parameters', () => {
      const poolConfig = sequelize.config.pool;
      expect(poolConfig).toBeDefined();
      expect(poolConfig?.min).toBe(config.dbPoolMin);
      expect(poolConfig?.max).toBe(config.dbPoolMax);
      expect(poolConfig?.acquire).toBe(30000);
      expect(poolConfig?.idle).toBe(10000);
    });

    it('should use MySQL dialect', () => {
      expect(sequelize.getDialect()).toBe('mysql');
    });
  });

  describe('testConnection', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully test database connection', async () => {
      // Mock successful authentication
      jest.spyOn(sequelize, 'authenticate').mockResolvedValue();

      await expect(testConnection()).resolves.toBeUndefined();
      expect(sequelize.authenticate).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        'Database connection established successfully',
        expect.objectContaining({
          host: config.dbHost,
          database: config.dbName,
        })
      );
    });

    it('should throw error when connection fails', async () => {
      const mockError = new Error('Connection refused');
      jest.spyOn(sequelize, 'authenticate').mockRejectedValue(mockError);

      await expect(testConnection()).rejects.toThrow('Database connection failed: Connection refused');
      expect(logger.error).toHaveBeenCalledWith(
        'Unable to connect to the database',
        expect.objectContaining({
          host: config.dbHost,
          database: config.dbName,
        })
      );
    });

    it('should handle non-Error exceptions', async () => {
      jest.spyOn(sequelize, 'authenticate').mockRejectedValue('String error');

      await expect(testConnection()).rejects.toThrow('Database connection failed: Unknown error');
    });

    it('should log connection duration', async () => {
      jest.spyOn(sequelize, 'authenticate').mockResolvedValue();

      await testConnection();

      expect(logger.info).toHaveBeenCalledWith(
        'Database connection established successfully',
        expect.objectContaining({
          duration: expect.any(Number),
        })
      );
    });
  });

  describe('closeConnection', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully close database connection', async () => {
      jest.spyOn(sequelize, 'close').mockResolvedValue();

      await expect(closeConnection()).resolves.toBeUndefined();
      expect(sequelize.close).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith('Database connection closed successfully');
    });

    it('should throw error when closing connection fails', async () => {
      const mockError = new Error('Close failed');
      jest.spyOn(sequelize, 'close').mockRejectedValue(mockError);

      await expect(closeConnection()).rejects.toThrow('Close failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Error closing database connection',
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Close failed',
          }),
        })
      );
    });
  });

  describe('getPoolStatus', () => {
    it('should return pool status with all metrics', () => {
      // Mock the connection manager pool
      const mockPool = {
        size: 5,
        available: 3,
        using: 2,
        waiting: 0,
      };
      
      (sequelize.connectionManager as any).pool = mockPool;

      const status = getPoolStatus();
      expect(status).toEqual({
        size: 5,
        available: 3,
        using: 2,
        waiting: 0,
      });
    });

    it('should return zeros when pool is not initialized', () => {
      (sequelize.connectionManager as any).pool = null;

      const status = getPoolStatus();
      expect(status).toEqual({
        size: 0,
        available: 0,
        using: 0,
        waiting: 0,
      });
    });
  });

  describe('isHealthy', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return true when database is healthy', async () => {
      jest.spyOn(sequelize, 'query').mockResolvedValue([[], 0] as any);

      const result = await isHealthy();
      expect(result).toBe(true);
      expect(sequelize.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return false when database query fails', async () => {
      const mockError = new Error('Query failed');
      jest.spyOn(sequelize, 'query').mockRejectedValue(mockError);

      const result = await isHealthy();
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Database health check failed',
        expect.objectContaining({
          error: 'Query failed',
        })
      );
    });

    it('should handle non-Error exceptions in health check', async () => {
      jest.spyOn(sequelize, 'query').mockRejectedValue('String error');

      const result = await isHealthy();
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Database health check failed',
        expect.objectContaining({
          error: 'Unknown error',
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle database connection timeout', async () => {
      const timeoutError = new Error('Connection timeout');
      jest.spyOn(sequelize, 'authenticate').mockRejectedValue(timeoutError);

      await expect(testConnection()).rejects.toThrow('Database connection failed: Connection timeout');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Access denied for user');
      jest.spyOn(sequelize, 'authenticate').mockRejectedValue(authError);

      await expect(testConnection()).rejects.toThrow('Database connection failed: Access denied for user');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('ECONNREFUSED');
      jest.spyOn(sequelize, 'authenticate').mockRejectedValue(networkError);

      await expect(testConnection()).rejects.toThrow('Database connection failed: ECONNREFUSED');
    });
  });

  describe('Connection Pool Configuration', () => {
    it('should respect minimum pool size configuration', () => {
      expect(sequelize.config.pool?.min).toBe(config.dbPoolMin);
      expect(sequelize.config.pool?.min).toBeGreaterThanOrEqual(0);
    });

    it('should respect maximum pool size configuration', () => {
      expect(sequelize.config.pool?.max).toBe(config.dbPoolMax);
      expect(sequelize.config.pool?.max).toBeGreaterThanOrEqual(config.dbPoolMin);
    });

    it('should have reasonable acquire timeout', () => {
      expect(sequelize.config.pool?.acquire).toBe(30000);
      expect(sequelize.config.pool?.acquire).toBeGreaterThan(0);
    });

    it('should have reasonable idle timeout', () => {
      expect(sequelize.config.pool?.idle).toBe(10000);
      expect(sequelize.config.pool?.idle).toBeGreaterThan(0);
    });
  });
});
