/**
 * Unit tests for Log model
 * Tests model definition, validation rules, and basic operations
 */

import { Log } from './Log';
import { sequelize } from '../config/database';

describe('Log Model', () => {
  beforeAll(async () => {
    // Sync the model with the database (create table if not exists)
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    // Clean up
    await sequelize.close();
  });

  afterEach(async () => {
    // Clear all logs after each test
    await Log.destroy({ where: {}, truncate: true });
  });

  describe('Model Definition', () => {
    it('should have correct table name', () => {
      expect(Log.tableName).toBe('logs');
    });

    it('should have correct field mappings', () => {
      const attributes = Log.getAttributes();
      
      expect(attributes.id.field).toBeUndefined(); // Primary key uses default field name
      expect(attributes.deviceUuid.field).toBe('device_uuid');
      expect(attributes.dataType.field).toBe('data_type');
      expect(attributes.logKey.field).toBe('log_key');
      expect(attributes.logValue.field).toBe('log_value');
      expect(attributes.createdAt.field).toBe('created_at');
    });

    it('should have correct data types', () => {
      const attributes = Log.getAttributes();
      
      expect(attributes.id.type.constructor.name).toBe('BIGINT');
      expect(attributes.deviceUuid.type.constructor.name).toBe('STRING');
      expect(attributes.dataType.type.constructor.name).toBe('ENUM');
      expect(attributes.logKey.type.constructor.name).toBe('STRING');
      expect(attributes.logValue.type.constructor.name).toBe('JSON');
      expect(attributes.createdAt.type.constructor.name).toBe('DATE');
    });
  });

  describe('Validation Rules', () => {
    it('should create a valid log entry', async () => {
      const log = await Log.create({
        deviceUuid: '123e4567-e89b-12d3-a456-426614174000',
        dataType: 'record',
        logKey: 'temperature',
        logValue: { value: 25.5, unit: 'celsius' },
      });

      expect(log.id).toBeDefined();
      expect(log.deviceUuid).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(log.dataType).toBe('record');
      expect(log.logKey).toBe('temperature');
      expect(log.logValue).toEqual({ value: 25.5, unit: 'celsius' });
      expect(log.createdAt).toBeInstanceOf(Date);
    });

    it('should reject log with missing deviceUuid', async () => {
      await expect(
        Log.create({
          deviceUuid: null as any,
          dataType: 'record',
          logKey: 'test',
          logValue: { data: 'test' },
        })
      ).rejects.toThrow();
    });

    it('should reject log with empty deviceUuid', async () => {
      await expect(
        Log.create({
          deviceUuid: '',
          dataType: 'record',
          logKey: 'test',
          logValue: { data: 'test' },
        })
      ).rejects.toThrow();
    });

    it('should reject log with missing dataType', async () => {
      await expect(
        Log.create({
          deviceUuid: '123e4567-e89b-12d3-a456-426614174000',
          dataType: null as any,
          logKey: 'test',
          logValue: { data: 'test' },
        })
      ).rejects.toThrow();
    });

    it('should reject log with invalid dataType', async () => {
      await expect(
        Log.create({
          deviceUuid: '123e4567-e89b-12d3-a456-426614174000',
          dataType: 'invalid' as any,
          logKey: 'test',
          logValue: { data: 'test' },
        })
      ).rejects.toThrow();
    });

    it('should accept all valid dataType values', async () => {
      const dataTypes: Array<'record' | 'warning' | 'error'> = ['record', 'warning', 'error'];
      
      for (const dataType of dataTypes) {
        const log = await Log.create({
          deviceUuid: '123e4567-e89b-12d3-a456-426614174000',
          dataType,
          logKey: 'test',
          logValue: { data: 'test' },
        });
        
        expect(log.dataType).toBe(dataType);
      }
    });

    it('should reject log with missing logKey', async () => {
      await expect(
        Log.create({
          deviceUuid: '123e4567-e89b-12d3-a456-426614174000',
          dataType: 'record',
          logKey: null as any,
          logValue: { data: 'test' },
        })
      ).rejects.toThrow();
    });

    it('should reject log with empty logKey', async () => {
      await expect(
        Log.create({
          deviceUuid: '123e4567-e89b-12d3-a456-426614174000',
          dataType: 'record',
          logKey: '',
          logValue: { data: 'test' },
        })
      ).rejects.toThrow();
    });

    it('should reject log with logKey exceeding 255 characters', async () => {
      const longKey = 'a'.repeat(256);
      
      await expect(
        Log.create({
          deviceUuid: '123e4567-e89b-12d3-a456-426614174000',
          dataType: 'record',
          logKey: longKey,
          logValue: { data: 'test' },
        })
      ).rejects.toThrow();
    });

    it('should accept logKey with exactly 255 characters', async () => {
      const maxKey = 'a'.repeat(255);
      
      const log = await Log.create({
        deviceUuid: '123e4567-e89b-12d3-a456-426614174000',
        dataType: 'record',
        logKey: maxKey,
        logValue: { data: 'test' },
      });
      
      expect(log.logKey).toBe(maxKey);
    });

    it('should reject log with missing logValue', async () => {
      await expect(
        Log.create({
          deviceUuid: '123e4567-e89b-12d3-a456-426614174000',
          dataType: 'record',
          logKey: 'test',
          logValue: null as any,
        })
      ).rejects.toThrow();
    });

    it('should accept complex JSON objects as logValue', async () => {
      const complexValue = {
        temperature: 25.5,
        humidity: 60,
        location: {
          lat: 40.7128,
          lng: -74.0060,
        },
        readings: [1, 2, 3, 4, 5],
        metadata: {
          sensor: 'DHT22',
          version: '1.0',
        },
      };
      
      const log = await Log.create({
        deviceUuid: '123e4567-e89b-12d3-a456-426614174000',
        dataType: 'record',
        logKey: 'sensor_data',
        logValue: complexValue,
      });
      
      expect(log.logValue).toEqual(complexValue);
    });
  });

  describe('Timestamp Generation', () => {
    it('should automatically generate createdAt timestamp', async () => {
      const beforeCreate = new Date();
      
      const log = await Log.create({
        deviceUuid: '123e4567-e89b-12d3-a456-426614174000',
        dataType: 'record',
        logKey: 'test',
        logValue: { data: 'test' },
      });
      
      const afterCreate = new Date();
      
      expect(log.createdAt).toBeInstanceOf(Date);
      expect(log.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(log.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it('should allow manual createdAt timestamp', async () => {
      const customTimestamp = new Date('2024-01-01T00:00:00Z');
      
      const log = await Log.create({
        deviceUuid: '123e4567-e89b-12d3-a456-426614174000',
        dataType: 'record',
        logKey: 'test',
        logValue: { data: 'test' },
        createdAt: customTimestamp,
      });
      
      expect(log.createdAt.toISOString()).toBe(customTimestamp.toISOString());
    });
  });

  describe('CRUD Operations', () => {
    it('should create and retrieve a log by id', async () => {
      const created = await Log.create({
        deviceUuid: '123e4567-e89b-12d3-a456-426614174000',
        dataType: 'warning',
        logKey: 'high_temperature',
        logValue: { value: 85, threshold: 80 },
      });
      
      const retrieved = await Log.findByPk(created.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.deviceUuid).toBe(created.deviceUuid);
      expect(retrieved!.dataType).toBe(created.dataType);
      expect(retrieved!.logKey).toBe(created.logKey);
      expect(retrieved!.logValue).toEqual(created.logValue);
    });

    it('should find logs by deviceUuid', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      
      await Log.create({
        deviceUuid: uuid,
        dataType: 'record',
        logKey: 'test1',
        logValue: { data: 'test1' },
      });
      
      await Log.create({
        deviceUuid: uuid,
        dataType: 'warning',
        logKey: 'test2',
        logValue: { data: 'test2' },
      });
      
      await Log.create({
        deviceUuid: 'different-uuid',
        dataType: 'record',
        logKey: 'test3',
        logValue: { data: 'test3' },
      });
      
      const logs = await Log.findAll({ where: { deviceUuid: uuid } });
      
      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.deviceUuid === uuid)).toBe(true);
    });

    it('should find logs by dataType', async () => {
      await Log.create({
        deviceUuid: 'uuid1',
        dataType: 'error',
        logKey: 'test1',
        logValue: { data: 'test1' },
      });
      
      await Log.create({
        deviceUuid: 'uuid2',
        dataType: 'error',
        logKey: 'test2',
        logValue: { data: 'test2' },
      });
      
      await Log.create({
        deviceUuid: 'uuid3',
        dataType: 'record',
        logKey: 'test3',
        logValue: { data: 'test3' },
      });
      
      const errorLogs = await Log.findAll({ where: { dataType: 'error' } });
      
      expect(errorLogs).toHaveLength(2);
      expect(errorLogs.every(log => log.dataType === 'error')).toBe(true);
    });

    it('should count logs correctly', async () => {
      await Log.create({
        deviceUuid: 'uuid1',
        dataType: 'record',
        logKey: 'test1',
        logValue: { data: 'test1' },
      });
      
      await Log.create({
        deviceUuid: 'uuid2',
        dataType: 'record',
        logKey: 'test2',
        logValue: { data: 'test2' },
      });
      
      const count = await Log.count();
      expect(count).toBe(2);
    });
  });

  describe('toJSON Method', () => {
    it('should convert model instance to plain object', async () => {
      const log = await Log.create({
        deviceUuid: '123e4567-e89b-12d3-a456-426614174000',
        dataType: 'record',
        logKey: 'test',
        logValue: { data: 'test' },
      });
      
      const json = log.toJSON();
      
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('deviceUuid');
      expect(json).toHaveProperty('dataType');
      expect(json).toHaveProperty('logKey');
      expect(json).toHaveProperty('logValue');
      expect(json).toHaveProperty('createdAt');
      
      expect(json.id).toBe(log.id);
      expect(json.deviceUuid).toBe(log.deviceUuid);
      expect(json.dataType).toBe(log.dataType);
      expect(json.logKey).toBe(log.logKey);
      expect(json.logValue).toEqual(log.logValue);
      expect(json.createdAt).toEqual(log.createdAt);
    });
  });
});
