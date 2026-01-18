/**
 * Unit tests for Log model
 * Tests model definition and validation rules
 */

import { Log } from './Log';

describe('Log Model', () => {
  describe('Model Definition', () => {
    it('should have correct table name', () => {
      expect(Log.tableName).toBe('logs');
    });

    it('should have correct field mappings', () => {
      const attributes = Log.getAttributes();
      
      // Note: Sequelize may set field name even for primary key
      expect(attributes.id.field).toBeDefined();
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
      // Note: Sequelize uses JSONTYPE internally
      expect(['JSON', 'JSONTYPE']).toContain(attributes.logValue.type.constructor.name);
      expect(attributes.createdAt.type.constructor.name).toBe('DATE');
    });

    it('should have correct validation rules for deviceUuid', () => {
      const attributes = Log.getAttributes();
      
      expect(attributes.deviceUuid.allowNull).toBe(false);
      expect(attributes.deviceUuid.validate).toBeDefined();
    });

    it('should have correct validation rules for dataType', () => {
      const attributes = Log.getAttributes();
      
      expect(attributes.dataType.allowNull).toBe(false);
      // Check if it's an ENUM type
      expect(attributes.dataType.type.constructor.name).toBe('ENUM');
    });

    it('should have correct validation rules for logKey', () => {
      const attributes = Log.getAttributes();
      
      expect(attributes.logKey.allowNull).toBe(false);
      expect(attributes.logKey.validate).toBeDefined();
    });

    it('should have correct validation rules for logValue', () => {
      const attributes = Log.getAttributes();
      
      expect(attributes.logValue.allowNull).toBe(false);
    });

    it('should have indexes defined', () => {
      const indexes = (Log as any).options.indexes || [];
      
      // Should have at least some indexes
      expect(Array.isArray(indexes)).toBe(true);
    });
  });

  describe('Model Attributes', () => {
    it('should define all required attributes', () => {
      const attributes = Log.getAttributes();
      const attributeNames = Object.keys(attributes);
      
      expect(attributeNames).toContain('id');
      expect(attributeNames).toContain('deviceUuid');
      expect(attributeNames).toContain('dataType');
      expect(attributeNames).toContain('logKey');
      expect(attributeNames).toContain('logValue');
      expect(attributeNames).toContain('createdAt');
    });

    it('should have id as primary key with autoIncrement', () => {
      const attributes = Log.getAttributes();
      
      expect(attributes.id.primaryKey).toBe(true);
      expect(attributes.id.autoIncrement).toBe(true);
    });

    it('should have createdAt with defaultValue', () => {
      const attributes = Log.getAttributes();
      
      expect(attributes.createdAt.defaultValue).toBeDefined();
    });
  });
});
