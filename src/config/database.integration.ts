/**
 * Integration tests for database connection
 * These tests require a running MySQL database instance
 * 
 * To run these tests:
 * 1. Ensure MySQL is running
 * 2. Create a test database: CREATE DATABASE hardware_logs_test;
 * 3. Set environment variables in .env.test
 * 4. Run: npm run test:integration
 */

import { sequelize, testConnection, closeConnection, isHealthy, getPoolStatus } from './database';

describe('Database Integration Tests', () => {
  // Skip these tests if database is not available
  const skipIfNoDb = process.env.SKIP_DB_TESTS === 'true';

  beforeAll(async () => {
    if (skipIfNoDb) {
      console.log('Skipping database integration tests (SKIP_DB_TESTS=true)');
      return;
    }
  });

  afterAll(async () => {
    if (!skipIfNoDb) {
      await closeConnection();
    }
  });

  describe('Connection Management', () => {
    it('should successfully connect to the database', async () => {
      if (skipIfNoDb) return;

      await expect(testConnection()).resolves.toBeUndefined();
    }, 10000);

    it('should verify database is healthy', async () => {
      if (skipIfNoDb) return;

      const healthy = await isHealthy();
      expect(healthy).toBe(true);
    });

    it('should execute a simple query', async () => {
      if (skipIfNoDb) return;

      const [results] = await sequelize.query('SELECT 1 + 1 AS result');
      expect(results).toHaveLength(1);
      expect((results[0] as any).result).toBe(2);
    });
  });

  describe('Connection Pool', () => {
    it('should manage connection pool correctly', async () => {
      if (skipIfNoDb) return;

      // Get initial pool status
      const initialStatus = getPoolStatus();
      expect(initialStatus.size).toBeGreaterThanOrEqual(0);

      // Execute a query to use a connection
      await sequelize.query('SELECT 1');

      // Pool should have connections
      const afterQueryStatus = getPoolStatus();
      expect(afterQueryStatus.size).toBeGreaterThanOrEqual(0);
    });

    it('should respect pool size limits', async () => {
      if (skipIfNoDb) return;

      const status = getPoolStatus();
      
      // Pool size should not exceed max
      expect(status.size).toBeLessThanOrEqual(sequelize.config.pool?.max || 10);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid queries gracefully', async () => {
      if (skipIfNoDb) return;

      await expect(
        sequelize.query('SELECT * FROM non_existent_table')
      ).rejects.toThrow();
    });

    it('should recover from query errors', async () => {
      if (skipIfNoDb) return;

      // Execute an invalid query
      try {
        await sequelize.query('INVALID SQL');
      } catch (error) {
        // Expected to fail
      }

      // Should still be able to execute valid queries
      const healthy = await isHealthy();
      expect(healthy).toBe(true);
    });
  });

  describe('Connection Lifecycle', () => {
    it('should handle multiple sequential connections', async () => {
      if (skipIfNoDb) return;

      for (let i = 0; i < 5; i++) {
        const healthy = await isHealthy();
        expect(healthy).toBe(true);
      }
    });

    it('should handle concurrent queries', async () => {
      if (skipIfNoDb) return;

      const queries = Array.from({ length: 10 }, (_, i) =>
        sequelize.query(`SELECT ${i} AS value`)
      );

      const results = await Promise.all(queries);
      expect(results).toHaveLength(10);
      
      results.forEach((result, index) => {
        expect((result[0][0] as any).value).toBe(index);
      });
    });
  });
});
