import { LogRepository } from './LogRepository';
import { Log } from '../models/Log';
import { DataType, LogFilters, Pagination, DatabaseError } from '../types';
import { sequelize } from '../config/database';

// Mock the logger to avoid console output during tests
jest.mock('../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logDatabaseOperation: jest.fn(),
}));

describe('LogRepository', () => {
  let repository: LogRepository;

  beforeAll(async () => {
    // Ensure database connection is established
    await sequelize.authenticate();
    // Sync the database schema (create tables if they don't exist)
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    repository = new LogRepository();
    // Clean up the database before each test
    await Log.destroy({ where: {}, truncate: true });
  });

  afterAll(async () => {
    // Close database connection after all tests
    await sequelize.close();
  });

  describe('create', () => {
    it('should create a log entry successfully', async () => {
      const logData = {
        deviceUuid: 'test-device-uuid-1',
        dataType: 'record' as DataType,
        logKey: 'test-key',
        logValue: { message: 'test message' },
      };

      const log = await repository.create(logData);

      expect(log).toBeDefined();
      expect(log.id).toBeDefined();
      expect(log.deviceUuid).toBe(logData.deviceUuid);
      expect(log.dataType).toBe(logData.dataType);
      expect(log.logKey).toBe(logData.logKey);
      expect(log.logValue).toEqual(logData.logValue);
      expect(log.createdAt).toBeInstanceOf(Date);
    });

    it('should auto-generate createdAt timestamp', async () => {
      const beforeCreate = new Date();
      
      const log = await repository.create({
        deviceUuid: 'test-device-uuid-2',
        dataType: 'warning' as DataType,
        logKey: 'test-key',
        logValue: { data: 'test' },
      });

      const afterCreate = new Date();

      expect(log.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(log.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it('should throw DatabaseError when creation fails due to missing required fields', async () => {
      const invalidData = {
        deviceUuid: '',
        dataType: 'record' as DataType,
        logKey: 'test-key',
        logValue: { data: 'test' },
      };

      await expect(repository.create(invalidData)).rejects.toThrow(DatabaseError);
    });

    it('should handle complex JSON values in logValue', async () => {
      const complexValue = {
        nested: {
          data: 'test',
          array: [1, 2, 3],
          boolean: true,
        },
        timestamp: new Date().toISOString(),
      };

      const log = await repository.create({
        deviceUuid: 'test-device-uuid-complex',
        dataType: 'record' as DataType,
        logKey: 'complex-key',
        logValue: complexValue,
      });

      expect(log.logValue).toEqual(complexValue);
    });

    it('should create logs with all three data types', async () => {
      const dataTypes: DataType[] = ['record', 'warning', 'error'];
      
      for (const dataType of dataTypes) {
        const log = await repository.create({
          deviceUuid: `device-${dataType}`,
          dataType,
          logKey: `key-${dataType}`,
          logValue: { type: dataType },
        });

        expect(log.dataType).toBe(dataType);
      }
    });

    it('should handle long key names', async () => {
      const longKey = 'a'.repeat(255); // Maximum length

      const log = await repository.create({
        deviceUuid: 'test-device-long-key',
        dataType: 'record' as DataType,
        logKey: longKey,
        logValue: { data: 'test' },
      });

      expect(log.logKey).toBe(longKey);
      expect(log.logKey.length).toBe(255);
    });
  });

  describe('findById', () => {
    it('should find a log by ID', async () => {
      const created = await repository.create({
        deviceUuid: 'test-device-uuid-3',
        dataType: 'error' as DataType,
        logKey: 'test-key',
        logValue: { error: 'test error' },
      });

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.deviceUuid).toBe(created.deviceUuid);
    });

    it('should return null when log ID does not exist', async () => {
      const found = await repository.findById(99999);

      expect(found).toBeNull();
    });
  });

  describe('findByFilters', () => {
    beforeEach(async () => {
      // Create test data
      await repository.create({
        deviceUuid: 'device-1',
        dataType: 'record' as DataType,
        logKey: 'key-1',
        logValue: { data: 'test1' },
      });

      await repository.create({
        deviceUuid: 'device-1',
        dataType: 'warning' as DataType,
        logKey: 'key-2',
        logValue: { data: 'test2' },
      });

      await repository.create({
        deviceUuid: 'device-2',
        dataType: 'error' as DataType,
        logKey: 'key-3',
        logValue: { data: 'test3' },
      });
    });

    it('should find logs by device UUID', async () => {
      const filters: LogFilters = { deviceUuid: 'device-1' };
      const pagination: Pagination = { page: 1, pageSize: 10 };

      const logs = await repository.findByFilters(filters, pagination);

      expect(logs).toHaveLength(2);
      expect(logs.every((log) => log.deviceUuid === 'device-1')).toBe(true);
    });

    it('should find logs by data type', async () => {
      const filters: LogFilters = { dataType: 'error' };
      const pagination: Pagination = { page: 1, pageSize: 10 };

      const logs = await repository.findByFilters(filters, pagination);

      expect(logs).toHaveLength(1);
      expect(logs[0].dataType).toBe('error');
    });

    it('should find logs by multiple filters', async () => {
      const filters: LogFilters = {
        deviceUuid: 'device-1',
        dataType: 'warning',
      };
      const pagination: Pagination = { page: 1, pageSize: 10 };

      const logs = await repository.findByFilters(filters, pagination);

      expect(logs).toHaveLength(1);
      expect(logs[0].deviceUuid).toBe('device-1');
      expect(logs[0].dataType).toBe('warning');
    });

    it('should respect pagination parameters', async () => {
      // Create more test data
      for (let i = 0; i < 5; i++) {
        await repository.create({
          deviceUuid: 'device-3',
          dataType: 'record' as DataType,
          logKey: `key-${i}`,
          logValue: { data: `test${i}` },
        });
      }

      const filters: LogFilters = { deviceUuid: 'device-3' };
      const pagination: Pagination = { page: 1, pageSize: 2 };

      const logs = await repository.findByFilters(filters, pagination);

      expect(logs).toHaveLength(2);
    });

    it('should return empty array when no logs match filters', async () => {
      const filters: LogFilters = { deviceUuid: 'non-existent-device' };
      const pagination: Pagination = { page: 1, pageSize: 10 };

      const logs = await repository.findByFilters(filters, pagination);

      expect(logs).toHaveLength(0);
    });

    it('should filter by time range', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
      const future = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour from now

      const filters: LogFilters = {
        startTime: past,
        endTime: future,
      };
      const pagination: Pagination = { page: 1, pageSize: 10 };

      const logs = await repository.findByFilters(filters, pagination);

      expect(logs.length).toBeGreaterThan(0);
      logs.forEach((log) => {
        expect(log.createdAt.getTime()).toBeGreaterThanOrEqual(past.getTime());
        expect(log.createdAt.getTime()).toBeLessThanOrEqual(future.getTime());
      });
    });

    it('should handle large dataset with pagination', async () => {
      // Create a large dataset
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          repository.create({
            deviceUuid: 'large-dataset-device',
            dataType: 'record' as DataType,
            logKey: `key-${i}`,
            logValue: { index: i },
          })
        );
      }
      await Promise.all(promises);

      // Test pagination through the dataset
      const pageSize = 10;
      const filters: LogFilters = { deviceUuid: 'large-dataset-device' };
      
      const page1 = await repository.findByFilters(filters, { page: 1, pageSize });
      const page2 = await repository.findByFilters(filters, { page: 2, pageSize });
      const page3 = await repository.findByFilters(filters, { page: 3, pageSize });

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(10);
      expect(page3).toHaveLength(10);

      // Verify no overlap between pages
      const page1Ids = page1.map((log) => log.id);
      const page2Ids = page2.map((log) => log.id);
      const page3Ids = page3.map((log) => log.id);

      expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
      expect(page2Ids.some((id) => page3Ids.includes(id))).toBe(false);
      expect(page1Ids.some((id) => page3Ids.includes(id))).toBe(false);
    });

    it('should return logs in descending order by createdAt', async () => {
      // Create logs with slight delays to ensure different timestamps
      await repository.create({
        deviceUuid: 'order-test',
        dataType: 'record' as DataType,
        logKey: 'first',
        logValue: { order: 1 },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.create({
        deviceUuid: 'order-test',
        dataType: 'record' as DataType,
        logKey: 'second',
        logValue: { order: 2 },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.create({
        deviceUuid: 'order-test',
        dataType: 'record' as DataType,
        logKey: 'third',
        logValue: { order: 3 },
      });

      const logs = await repository.findByFilters(
        { deviceUuid: 'order-test' },
        { page: 1, pageSize: 10 }
      );

      expect(logs).toHaveLength(3);
      // Most recent first (descending order)
      expect(logs[0].logKey).toBe('third');
      expect(logs[1].logKey).toBe('second');
      expect(logs[2].logKey).toBe('first');
    });

    it('should handle edge case of page beyond available data', async () => {
      await repository.create({
        deviceUuid: 'edge-case-device',
        dataType: 'record' as DataType,
        logKey: 'only-log',
        logValue: { data: 'test' },
      });

      const logs = await repository.findByFilters(
        { deviceUuid: 'edge-case-device' },
        { page: 10, pageSize: 10 } // Page far beyond available data
      );

      expect(logs).toHaveLength(0);
    });
  });

  describe('countByFilters', () => {
    beforeEach(async () => {
      // Create test data
      await repository.create({
        deviceUuid: 'device-1',
        dataType: 'record' as DataType,
        logKey: 'key-1',
        logValue: { data: 'test1' },
      });

      await repository.create({
        deviceUuid: 'device-1',
        dataType: 'warning' as DataType,
        logKey: 'key-2',
        logValue: { data: 'test2' },
      });

      await repository.create({
        deviceUuid: 'device-2',
        dataType: 'error' as DataType,
        logKey: 'key-3',
        logValue: { data: 'test3' },
      });
    });

    it('should count logs by device UUID', async () => {
      const filters: LogFilters = { deviceUuid: 'device-1' };

      const count = await repository.countByFilters(filters);

      expect(count).toBe(2);
    });

    it('should count logs by data type', async () => {
      const filters: LogFilters = { dataType: 'error' };

      const count = await repository.countByFilters(filters);

      expect(count).toBe(1);
    });

    it('should return 0 when no logs match filters', async () => {
      const filters: LogFilters = { deviceUuid: 'non-existent-device' };

      const count = await repository.countByFilters(filters);

      expect(count).toBe(0);
    });

    it('should count logs with multiple filters', async () => {
      const filters: LogFilters = {
        deviceUuid: 'device-1',
        dataType: 'warning',
      };

      const count = await repository.countByFilters(filters);

      expect(count).toBe(1);
    });

    it('should count logs within time range', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60);
      const future = new Date(now.getTime() + 1000 * 60 * 60);

      const filters: LogFilters = {
        startTime: past,
        endTime: future,
      };

      const count = await repository.countByFilters(filters);

      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('should count all logs when no filters provided', async () => {
      const filters: LogFilters = {};

      const count = await repository.countByFilters(filters);

      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('should match count with findByFilters result length for small datasets', async () => {
      const filters: LogFilters = { deviceUuid: 'device-1' };
      const pagination: Pagination = { page: 1, pageSize: 100 };

      const count = await repository.countByFilters(filters);
      const logs = await repository.findByFilters(filters, pagination);

      expect(count).toBe(logs.length);
    });
  });

  describe('aggregateByDevice', () => {
    beforeEach(async () => {
      // Create test data for device-1
      await repository.create({
        deviceUuid: 'device-1',
        dataType: 'record' as DataType,
        logKey: 'key-1',
        logValue: { data: 'test1' },
      });

      await repository.create({
        deviceUuid: 'device-1',
        dataType: 'record' as DataType,
        logKey: 'key-2',
        logValue: { data: 'test2' },
      });

      await repository.create({
        deviceUuid: 'device-1',
        dataType: 'warning' as DataType,
        logKey: 'key-3',
        logValue: { data: 'test3' },
      });

      await repository.create({
        deviceUuid: 'device-1',
        dataType: 'error' as DataType,
        logKey: 'key-4',
        logValue: { data: 'test4' },
      });
    });

    it('should aggregate logs by device', async () => {
      const report = await repository.aggregateByDevice('device-1');

      expect(report.deviceUuid).toBe('device-1');
      expect(report.totalLogs).toBe(4);
      expect(report.recordCount).toBe(2);
      expect(report.warningCount).toBe(1);
      expect(report.errorCount).toBe(1);
      expect(report.firstLogTime).toBeTruthy();
      expect(report.lastLogTime).toBeTruthy();
    });

    it('should return empty report for device with no logs', async () => {
      const report = await repository.aggregateByDevice('non-existent-device');

      expect(report.deviceUuid).toBe('non-existent-device');
      expect(report.totalLogs).toBe(0);
      expect(report.recordCount).toBe(0);
      expect(report.warningCount).toBe(0);
      expect(report.errorCount).toBe(0);
      expect(report.firstLogTime).toBe('');
      expect(report.lastLogTime).toBe('');
    });

    it('should correctly calculate totals with only one data type', async () => {
      // Create device with only errors
      for (let i = 0; i < 5; i++) {
        await repository.create({
          deviceUuid: 'error-only-device',
          dataType: 'error' as DataType,
          logKey: `error-${i}`,
          logValue: { error: `error ${i}` },
        });
      }

      const report = await repository.aggregateByDevice('error-only-device');

      expect(report.totalLogs).toBe(5);
      expect(report.recordCount).toBe(0);
      expect(report.warningCount).toBe(0);
      expect(report.errorCount).toBe(5);
    });

    it('should correctly identify first and last log times', async () => {
      const firstLog = await repository.create({
        deviceUuid: 'time-test-device',
        dataType: 'record' as DataType,
        logKey: 'first',
        logValue: { data: 'first' },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await repository.create({
        deviceUuid: 'time-test-device',
        dataType: 'warning' as DataType,
        logKey: 'middle',
        logValue: { data: 'middle' },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const lastLog = await repository.create({
        deviceUuid: 'time-test-device',
        dataType: 'error' as DataType,
        logKey: 'last',
        logValue: { data: 'last' },
      });

      const report = await repository.aggregateByDevice('time-test-device');

      expect(new Date(report.firstLogTime).getTime()).toBe(firstLog.createdAt.getTime());
      expect(new Date(report.lastLogTime).getTime()).toBe(lastLog.createdAt.getTime());
      expect(new Date(report.lastLogTime).getTime()).toBeGreaterThan(
        new Date(report.firstLogTime).getTime()
      );
    });

    it('should handle device with large number of logs', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        const dataType = ['record', 'warning', 'error'][i % 3] as DataType;
        promises.push(
          repository.create({
            deviceUuid: 'large-device',
            dataType,
            logKey: `key-${i}`,
            logValue: { index: i },
          })
        );
      }
      await Promise.all(promises);

      const report = await repository.aggregateByDevice('large-device');

      expect(report.totalLogs).toBe(100);
      // 100 logs divided by 3 types: 34 record, 33 warning, 33 error
      expect(report.recordCount + report.warningCount + report.errorCount).toBe(100);
    });
  });

  describe('aggregateByTimeRange', () => {
    beforeEach(async () => {
      // Create test data
      await repository.create({
        deviceUuid: 'device-1',
        dataType: 'record' as DataType,
        logKey: 'key-1',
        logValue: { data: 'test1' },
      });

      await repository.create({
        deviceUuid: 'device-2',
        dataType: 'warning' as DataType,
        logKey: 'key-2',
        logValue: { data: 'test2' },
      });

      await repository.create({
        deviceUuid: 'device-1',
        dataType: 'error' as DataType,
        logKey: 'key-3',
        logValue: { data: 'test3' },
      });
    });

    it('should aggregate logs by time range', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
      const future = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour from now

      const report = await repository.aggregateByTimeRange(past, future);

      expect(report.startTime).toBe(past.toISOString());
      expect(report.endTime).toBe(future.toISOString());
      expect(report.totalLogs).toBe(3);
      expect(report.recordCount).toBe(1);
      expect(report.warningCount).toBe(1);
      expect(report.errorCount).toBe(1);
      expect(report.deviceCount).toBe(2);
    });

    it('should return empty report for time range with no logs', async () => {
      const past = new Date('2020-01-01');
      const end = new Date('2020-01-02');

      const report = await repository.aggregateByTimeRange(past, end);

      expect(report.totalLogs).toBe(0);
      expect(report.recordCount).toBe(0);
      expect(report.warningCount).toBe(0);
      expect(report.errorCount).toBe(0);
      expect(report.deviceCount).toBe(0);
    });

    it('should correctly count unique devices in time range', async () => {
      // Create logs from multiple devices
      const devices = ['dev-1', 'dev-2', 'dev-3', 'dev-1', 'dev-2'];
      
      for (const device of devices) {
        await repository.create({
          deviceUuid: device,
          dataType: 'record' as DataType,
          logKey: 'test-key',
          logValue: { data: 'test' },
        });
      }

      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60);
      const future = new Date(now.getTime() + 1000 * 60 * 60);

      const report = await repository.aggregateByTimeRange(past, future);

      // Should count 3 unique devices (dev-1, dev-2, dev-3)
      expect(report.deviceCount).toBeGreaterThanOrEqual(3);
    });

    it('should handle time range with only one data type', async () => {
      // Clear existing data
      await Log.destroy({ where: {}, truncate: true });

      // Create only warnings
      for (let i = 0; i < 5; i++) {
        await repository.create({
          deviceUuid: `device-${i}`,
          dataType: 'warning' as DataType,
          logKey: 'warning-key',
          logValue: { warning: 'test' },
        });
      }

      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60);
      const future = new Date(now.getTime() + 1000 * 60 * 60);

      const report = await repository.aggregateByTimeRange(past, future);

      expect(report.totalLogs).toBe(5);
      expect(report.recordCount).toBe(0);
      expect(report.warningCount).toBe(5);
      expect(report.errorCount).toBe(0);
      expect(report.deviceCount).toBe(5);
    });

    it('should verify total equals sum of type counts', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60);
      const future = new Date(now.getTime() + 1000 * 60 * 60);

      const report = await repository.aggregateByTimeRange(past, future);

      expect(report.totalLogs).toBe(
        report.recordCount + report.warningCount + report.errorCount
      );
    });

    it('should handle exact boundary times', async () => {
      const log = await repository.create({
        deviceUuid: 'boundary-device',
        dataType: 'record' as DataType,
        logKey: 'boundary-key',
        logValue: { data: 'boundary' },
      });

      // Use exact log creation time as boundaries
      const report = await repository.aggregateByTimeRange(
        log.createdAt,
        log.createdAt
      );

      expect(report.totalLogs).toBeGreaterThanOrEqual(1);
    });
  });

  describe('aggregateErrors', () => {
    beforeEach(async () => {
      // Create test error logs
      await repository.create({
        deviceUuid: 'device-1',
        dataType: 'error' as DataType,
        logKey: 'error-key-1',
        logValue: { error: 'test error 1' },
      });

      await repository.create({
        deviceUuid: 'device-1',
        dataType: 'error' as DataType,
        logKey: 'error-key-1',
        logValue: { error: 'test error 2' },
      });

      await repository.create({
        deviceUuid: 'device-2',
        dataType: 'error' as DataType,
        logKey: 'error-key-2',
        logValue: { error: 'test error 3' },
      });

      // Create non-error logs (should not be included)
      await repository.create({
        deviceUuid: 'device-1',
        dataType: 'record' as DataType,
        logKey: 'key-1',
        logValue: { data: 'test' },
      });
    });

    it('should aggregate error logs', async () => {
      const report = await repository.aggregateErrors();

      expect(report.totalErrors).toBe(3);
      expect(report.errors).toHaveLength(2); // 2 unique device-key combinations
      
      // Find the error with device-1 and error-key-1
      const error1 = report.errors.find(
        (e) => e.deviceUuid === 'device-1' && e.key === 'error-key-1'
      );
      expect(error1).toBeDefined();
      expect(error1?.count).toBe(2);
      expect(error1?.lastOccurrence).toBeTruthy();

      // Find the error with device-2 and error-key-2
      const error2 = report.errors.find(
        (e) => e.deviceUuid === 'device-2' && e.key === 'error-key-2'
      );
      expect(error2).toBeDefined();
      expect(error2?.count).toBe(1);
    });

    it('should return empty report when no error logs exist', async () => {
      // Clear all logs
      await Log.destroy({ where: {}, truncate: true });

      const report = await repository.aggregateErrors();

      expect(report.totalErrors).toBe(0);
      expect(report.errors).toHaveLength(0);
    });

    it('should order errors by count descending', async () => {
      // Clear existing data
      await Log.destroy({ where: {}, truncate: true });

      // Create errors with different counts
      for (let i = 0; i < 5; i++) {
        await repository.create({
          deviceUuid: 'device-1',
          dataType: 'error' as DataType,
          logKey: 'frequent-error',
          logValue: { error: 'frequent' },
        });
      }

      for (let i = 0; i < 2; i++) {
        await repository.create({
          deviceUuid: 'device-2',
          dataType: 'error' as DataType,
          logKey: 'rare-error',
          logValue: { error: 'rare' },
        });
      }

      const report = await repository.aggregateErrors();

      expect(report.errors[0].count).toBeGreaterThanOrEqual(report.errors[1].count);
    });

    it('should not include non-error logs in aggregation', async () => {
      // Clear existing data
      await Log.destroy({ where: {}, truncate: true });

      // Create mix of log types
      await repository.create({
        deviceUuid: 'device-1',
        dataType: 'record' as DataType,
        logKey: 'record-key',
        logValue: { data: 'record' },
      });

      await repository.create({
        deviceUuid: 'device-1',
        dataType: 'warning' as DataType,
        logKey: 'warning-key',
        logValue: { data: 'warning' },
      });

      await repository.create({
        deviceUuid: 'device-1',
        dataType: 'error' as DataType,
        logKey: 'error-key',
        logValue: { error: 'error' },
      });

      const report = await repository.aggregateErrors();

      expect(report.totalErrors).toBe(1);
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].key).toBe('error-key');
    });

    it('should correctly track last occurrence time', async () => {
      // Clear existing data
      await Log.destroy({ where: {}, truncate: true });

      const firstError = await repository.create({
        deviceUuid: 'device-1',
        dataType: 'error' as DataType,
        logKey: 'tracked-error',
        logValue: { error: 'first' },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const lastError = await repository.create({
        deviceUuid: 'device-1',
        dataType: 'error' as DataType,
        logKey: 'tracked-error',
        logValue: { error: 'last' },
      });

      const report = await repository.aggregateErrors();

      expect(report.errors).toHaveLength(1);
      expect(new Date(report.errors[0].lastOccurrence).getTime()).toBe(
        lastError.createdAt.getTime()
      );
      expect(new Date(report.errors[0].lastOccurrence).getTime()).toBeGreaterThan(
        firstError.createdAt.getTime()
      );
    });

    it('should handle multiple devices with same error key', async () => {
      // Clear existing data
      await Log.destroy({ where: {}, truncate: true });

      // Create same error key on different devices
      await repository.create({
        deviceUuid: 'device-1',
        dataType: 'error' as DataType,
        logKey: 'common-error',
        logValue: { error: 'error' },
      });

      await repository.create({
        deviceUuid: 'device-2',
        dataType: 'error' as DataType,
        logKey: 'common-error',
        logValue: { error: 'error' },
      });

      await repository.create({
        deviceUuid: 'device-3',
        dataType: 'error' as DataType,
        logKey: 'common-error',
        logValue: { error: 'error' },
      });

      const report = await repository.aggregateErrors();

      // Should have 3 separate entries (one per device)
      expect(report.errors).toHaveLength(3);
      expect(report.totalErrors).toBe(3);
      
      const devices = report.errors.map((e) => e.deviceUuid);
      expect(devices).toContain('device-1');
      expect(devices).toContain('device-2');
      expect(devices).toContain('device-3');
    });

    it('should verify totalErrors equals sum of individual counts', async () => {
      const report = await repository.aggregateErrors();

      const sumOfCounts = report.errors.reduce((sum, error) => sum + error.count, 0);
      expect(report.totalErrors).toBe(sumOfCounts);
    });

    it('should handle large number of error types', async () => {
      // Clear existing data
      await Log.destroy({ where: {}, truncate: true });

      // Create many different error types
      for (let i = 0; i < 20; i++) {
        await repository.create({
          deviceUuid: `device-${i % 5}`,
          dataType: 'error' as DataType,
          logKey: `error-type-${i}`,
          logValue: { error: `error ${i}` },
        });
      }

      const report = await repository.aggregateErrors();

      expect(report.errors.length).toBe(20);
      expect(report.totalErrors).toBe(20);
    });
  });
});
