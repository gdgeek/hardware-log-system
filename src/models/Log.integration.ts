/**
 * Integration tests for Log model
 * These tests require a running MySQL database instance
 * 
 * Tests verify:
 * - Model can be synced with database
 * - Indexes are created correctly
 * - CRUD operations work with real database
 * - Validation rules are enforced at database level
 */

import { Log } from './Log';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';

describe('Log Model Integration Tests', () => {
  const skipIfNoDb = process.env.SKIP_DB_TESTS === 'true';

  beforeAll(async () => {
    if (skipIfNoDb) {
      console.log('Skipping Log model integration tests (SKIP_DB_TESTS=true)');
      return;
    }

    // Sync the model with the database
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    if (!skipIfNoDb) {
      await sequelize.close();
    }
  });

  afterEach(async () => {
    if (!skipIfNoDb) {
      await Log.destroy({ where: {}, truncate: true });
    }
  });

  describe('Database Schema', () => {
    it('should create table with correct structure', async () => {
      if (skipIfNoDb) return;

      const [results] = await sequelize.query(`
        SHOW CREATE TABLE logs
      `);

      const createTableSql = (results[0] as any)['Create Table'];
      
      // Verify table exists and has correct structure
      expect(createTableSql).toContain('CREATE TABLE `logs`');
      expect(createTableSql).toContain('`id` bigint');
      expect(createTableSql).toContain('`device_uuid` varchar(36)');
      expect(createTableSql).toContain('`data_type` enum');
      expect(createTableSql).toContain('`log_key` varchar(255)');
      expect(createTableSql).toContain('`log_value` json');
      expect(createTableSql).toContain('`created_at`');
    });

    it('should have all required indexes', async () => {
      if (skipIfNoDb) return;

      const [results] = await sequelize.query(`
        SHOW INDEX FROM logs
      `);

      const indexes = (results as any[]).map(r => r.Key_name);
      
      // Verify all indexes exist
      expect(indexes).toContain('PRIMARY');
      expect(indexes).toContain('idx_device_uuid');
      expect(indexes).toContain('idx_data_type');
      expect(indexes).toContain('idx_created_at');
      expect(indexes).toContain('idx_device_type');
      expect(indexes).toContain('idx_device_time');
    });

    it('should verify composite index on device_uuid and data_type', async () => {
      if (skipIfNoDb) return;

      const [results] = await sequelize.query(`
        SHOW INDEX FROM logs WHERE Key_name = 'idx_device_type'
      `);

      const indexColumns = (results as any[]).map(r => r.Column_name);
      
      expect(indexColumns).toContain('device_uuid');
      expect(indexColumns).toContain('data_type');
    });

    it('should verify composite index on device_uuid and created_at', async () => {
      if (skipIfNoDb) return;

      const [results] = await sequelize.query(`
        SHOW INDEX FROM logs WHERE Key_name = 'idx_device_time'
      `);

      const indexColumns = (results as any[]).map(r => r.Column_name);
      
      expect(indexColumns).toContain('device_uuid');
      expect(indexColumns).toContain('created_at');
    });
  });

  describe('CRUD Operations with Database', () => {
    it('should insert and retrieve a log entry', async () => {
      if (skipIfNoDb) return;

      const logData = {
        deviceUuid: '123e4567-e89b-12d3-a456-426614174000',
        dataType: 'record' as const,
        logKey: 'temperature',
        logValue: { value: 25.5, unit: 'celsius' },
      };

      const created = await Log.create(logData);
      expect(created.id).toBeDefined();

      const retrieved = await Log.findByPk(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.deviceUuid).toBe(logData.deviceUuid);
      expect(retrieved!.dataType).toBe(logData.dataType);
      expect(retrieved!.logKey).toBe(logData.logKey);
      expect(retrieved!.logValue).toEqual(logData.logValue);
    });

    it('should handle bulk insert operations', async () => {
      if (skipIfNoDb) return;

      const logs = Array.from({ length: 100 }, (_, i) => ({
        deviceUuid: `device-${i % 10}`,
        dataType: (['record', 'warning', 'error'] as const)[i % 3],
        logKey: `key-${i}`,
        logValue: { index: i, data: `test-${i}` },
      }));

      await Log.bulkCreate(logs);

      const count = await Log.count();
      expect(count).toBe(100);
    });

    it('should query logs with complex filters', async () => {
      if (skipIfNoDb) return;

      const uuid1 = '123e4567-e89b-12d3-a456-426614174000';
      const uuid2 = '987e6543-e21b-12d3-a456-426614174000';

      // Create test data
      await Log.bulkCreate([
        { deviceUuid: uuid1, dataType: 'record', logKey: 'test1', logValue: { v: 1 } },
        { deviceUuid: uuid1, dataType: 'warning', logKey: 'test2', logValue: { v: 2 } },
        { deviceUuid: uuid1, dataType: 'error', logKey: 'test3', logValue: { v: 3 } },
        { deviceUuid: uuid2, dataType: 'record', logKey: 'test4', logValue: { v: 4 } },
        { deviceUuid: uuid2, dataType: 'error', logKey: 'test5', logValue: { v: 5 } },
      ]);

      // Query with multiple filters
      const results = await Log.findAll({
        where: {
          deviceUuid: uuid1,
          dataType: { [Op.in]: ['warning', 'error'] },
        },
      });

      expect(results).toHaveLength(2);
      expect(results.every(log => log.deviceUuid === uuid1)).toBe(true);
      expect(results.every(log => ['warning', 'error'].includes(log.dataType))).toBe(true);
    });

    it('should query logs by time range', async () => {
      if (skipIfNoDb) return;

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Create logs with different timestamps
      await Log.create({
        deviceUuid: 'device-1',
        dataType: 'record',
        logKey: 'old',
        logValue: { v: 1 },
        createdAt: twoHoursAgo,
      });

      await Log.create({
        deviceUuid: 'device-1',
        dataType: 'record',
        logKey: 'recent',
        logValue: { v: 2 },
        createdAt: oneHourAgo,
      });

      await Log.create({
        deviceUuid: 'device-1',
        dataType: 'record',
        logKey: 'current',
        logValue: { v: 3 },
        createdAt: now,
      });

      // Query logs from last hour
      const recentLogs = await Log.findAll({
        where: {
          createdAt: {
            [Op.gte]: oneHourAgo,
          },
        },
        order: [['createdAt', 'ASC']],
      });

      expect(recentLogs).toHaveLength(2);
      expect(recentLogs[0].logKey).toBe('recent');
      expect(recentLogs[1].logKey).toBe('current');
    });

    it('should support pagination', async () => {
      if (skipIfNoDb) return;

      // Create 25 logs
      const logs = Array.from({ length: 25 }, (_, i) => ({
        deviceUuid: 'device-1',
        dataType: 'record' as const,
        logKey: `key-${i}`,
        logValue: { index: i },
      }));

      await Log.bulkCreate(logs);

      // Get first page (10 items)
      const page1 = await Log.findAll({
        limit: 10,
        offset: 0,
        order: [['id', 'ASC']],
      });

      expect(page1).toHaveLength(10);

      // Get second page (10 items)
      const page2 = await Log.findAll({
        limit: 10,
        offset: 10,
        order: [['id', 'ASC']],
      });

      expect(page2).toHaveLength(10);

      // Get third page (5 items)
      const page3 = await Log.findAll({
        limit: 10,
        offset: 20,
        order: [['id', 'ASC']],
      });

      expect(page3).toHaveLength(5);

      // Verify no overlap
      const allIds = [...page1, ...page2, ...page3].map(log => log.id);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(25);
    });
  });

  describe('Aggregation Queries', () => {
    it('should count logs by device', async () => {
      if (skipIfNoDb) return;

      await Log.bulkCreate([
        { deviceUuid: 'device-1', dataType: 'record', logKey: 'k1', logValue: { v: 1 } },
        { deviceUuid: 'device-1', dataType: 'warning', logKey: 'k2', logValue: { v: 2 } },
        { deviceUuid: 'device-2', dataType: 'record', logKey: 'k3', logValue: { v: 3 } },
      ]);

      const device1Count = await Log.count({ where: { deviceUuid: 'device-1' } });
      const device2Count = await Log.count({ where: { deviceUuid: 'device-2' } });

      expect(device1Count).toBe(2);
      expect(device2Count).toBe(1);
    });

    it('should count logs by data type', async () => {
      if (skipIfNoDb) return;

      await Log.bulkCreate([
        { deviceUuid: 'device-1', dataType: 'record', logKey: 'k1', logValue: { v: 1 } },
        { deviceUuid: 'device-1', dataType: 'record', logKey: 'k2', logValue: { v: 2 } },
        { deviceUuid: 'device-1', dataType: 'warning', logKey: 'k3', logValue: { v: 3 } },
        { deviceUuid: 'device-1', dataType: 'error', logKey: 'k4', logValue: { v: 4 } },
      ]);

      const recordCount = await Log.count({ where: { dataType: 'record' } });
      const warningCount = await Log.count({ where: { dataType: 'warning' } });
      const errorCount = await Log.count({ where: { dataType: 'error' } });

      expect(recordCount).toBe(2);
      expect(warningCount).toBe(1);
      expect(errorCount).toBe(1);
    });
  });

  describe('Performance with Indexes', () => {
    it('should efficiently query large dataset by device', async () => {
      if (skipIfNoDb) return;

      // Create 1000 logs across 10 devices
      const logs = Array.from({ length: 1000 }, (_, i) => ({
        deviceUuid: `device-${i % 10}`,
        dataType: (['record', 'warning', 'error'] as const)[i % 3],
        logKey: `key-${i}`,
        logValue: { index: i },
      }));

      await Log.bulkCreate(logs);

      const startTime = Date.now();
      const deviceLogs = await Log.findAll({
        where: { deviceUuid: 'device-5' },
      });
      const duration = Date.now() - startTime;

      expect(deviceLogs).toHaveLength(100);
      // Query should be fast with index (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should efficiently query by composite index', async () => {
      if (skipIfNoDb) return;

      // Create 1000 logs
      const logs = Array.from({ length: 1000 }, (_, i) => ({
        deviceUuid: `device-${i % 10}`,
        dataType: (['record', 'warning', 'error'] as const)[i % 3],
        logKey: `key-${i}`,
        logValue: { index: i },
      }));

      await Log.bulkCreate(logs);

      const startTime = Date.now();
      const results = await Log.findAll({
        where: {
          deviceUuid: 'device-5',
          dataType: 'error',
        },
      });
      const duration = Date.now() - startTime;

      expect(results.length).toBeGreaterThan(0);
      // Query should be fast with composite index (< 100ms)
      expect(duration).toBeLessThan(100);
    });
  });
});
