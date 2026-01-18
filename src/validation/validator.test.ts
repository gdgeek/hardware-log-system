/**
 * Unit tests for validation utility functions
 * 
 * Tests:
 * - validate() function
 * - validateOrThrow() function
 * - isValidJson() function
 * - isValidUuid() function
 * - isValidDataType() function
 * 
 * Requirements: 1.3, 1.4, 1.5
 */

import Joi from 'joi';
import {
  validate,
  validateOrThrow,
  isValidJson,
  isValidUuid,
  isValidDataType
} from './validator';
import { ValidationError } from '../types';

describe('Validator Utilities', () => {
  describe('validate()', () => {
    const testSchema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().min(0).required()
    });

    it('should return value when validation succeeds', () => {
      const data = { name: 'John', age: 30 };
      const result = validate(testSchema, data);

      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(data);
    });

    it('should return error when validation fails', () => {
      const data = { name: 'John' }; // Missing age
      const result = validate(testSchema, data);

      expect(result.value).toBeUndefined();
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toBe('Validation failed');
    });

    it('should collect all validation errors', () => {
      const data = { name: '', age: -5 }; // Both invalid
      const result = validate(testSchema, data);

      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error?.details?.errors).toHaveLength(2);
    });

    it('should strip unknown fields', () => {
      const data = { name: 'John', age: 30, extra: 'field' };
      const result = validate(testSchema, data);

      expect(result.error).toBeUndefined();
      expect(result.value).toEqual({ name: 'John', age: 30 });
      expect(result.value).not.toHaveProperty('extra');
    });

    it('should convert types when possible', () => {
      const data = { name: 'John', age: '30' }; // age as string
      const result = validate(testSchema, data);

      expect(result.error).toBeUndefined();
      expect(result.value?.age).toBe(30);
      expect(typeof result.value?.age).toBe('number');
    });

    it('should include field path in error details', () => {
      const nestedSchema = Joi.object({
        user: Joi.object({
          email: Joi.string().email().required()
        })
      });

      const data = { user: { email: 'invalid-email' } };
      const result = validate(nestedSchema, data);

      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error?.details?.errors[0].field).toBe('user.email');
    });
  });

  describe('validateOrThrow()', () => {
    const testSchema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().min(0).required()
    });

    it('should return value when validation succeeds', () => {
      const data = { name: 'John', age: 30 };
      const result = validateOrThrow(testSchema, data);

      expect(result).toEqual(data);
    });

    it('should throw ValidationError when validation fails', () => {
      const data = { name: 'John' }; // Missing age

      expect(() => validateOrThrow(testSchema, data)).toThrow(ValidationError);
    });

    it('should throw error with correct code and message', () => {
      const data = { name: '', age: -5 };

      try {
        validateOrThrow(testSchema, data);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).code).toBe('VALIDATION_ERROR');
        expect((error as ValidationError).message).toBe('Validation failed');
      }
    });

    it('should include all validation errors in thrown error', () => {
      const data = { name: '', age: -5 };

      try {
        validateOrThrow(testSchema, data);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect((error as ValidationError).details?.errors).toHaveLength(2);
      }
    });
  });

  describe('isValidJson()', () => {
    it('should return true for valid JSON objects', () => {
      expect(isValidJson({})).toBe(true);
      expect(isValidJson({ key: 'value' })).toBe(true);
      expect(isValidJson({ nested: { object: true } })).toBe(true);
      expect(isValidJson({ array: [1, 2, 3] })).toBe(true);
      expect(isValidJson({ number: 123, string: 'test', bool: true })).toBe(true);
    });

    it('should return false for non-object types', () => {
      expect(isValidJson('string')).toBe(false);
      expect(isValidJson(123)).toBe(false);
      expect(isValidJson(true)).toBe(false);
      expect(isValidJson(null)).toBe(false);
      expect(isValidJson(undefined)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isValidJson([])).toBe(false);
      expect(isValidJson([1, 2, 3])).toBe(false);
      expect(isValidJson([{ key: 'value' }])).toBe(false);
    });

    it('should return true for objects with various data types', () => {
      const complexObject = {
        string: 'test',
        number: 123,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: {
          deep: {
            value: 'test'
          }
        }
      };

      expect(isValidJson(complexObject)).toBe(true);
    });

    it('should handle objects with circular references gracefully', () => {
      const circular: any = { key: 'value' };
      circular.self = circular;

      // Should return false because circular references can't be stringified
      expect(isValidJson(circular)).toBe(false);
    });
  });

  describe('isValidUuid()', () => {
    it('should return true for valid UUID v4', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '123e4567-e89b-42d3-a456-426614174000',
        'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE' // Uppercase
      ];

      validUuids.forEach(uuid => {
        expect(isValidUuid(uuid)).toBe(true);
      });
    });

    it('should return false for invalid UUID formats', () => {
      const invalidUuids = [
        'not-a-uuid',
        '550e8400-e29b-31d4-a716-446655440000', // Version 3, not 4
        '550e8400-e29b-51d4-a716-446655440000', // Version 5, not 4
        '550e8400-e29b-41d4-c716-446655440000', // Invalid variant
        'g50e8400-e29b-41d4-a716-446655440000', // Invalid character
        '550e8400e29b41d4a716446655440000', // Missing hyphens
        '550e8400-e29b-41d4-a716-44665544000', // Too short
        '550e8400-e29b-41d4-a716-4466554400000', // Too long
        '', // Empty string
        '550e8400-e29b-41d4-a716', // Incomplete
        '12345678-1234-1234-1234-123456789012' // Not v4
      ];

      invalidUuids.forEach(uuid => {
        expect(isValidUuid(uuid)).toBe(false);
      });
    });

    it('should be case-insensitive', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(isValidUuid(uuid.toLowerCase())).toBe(true);
      expect(isValidUuid(uuid.toUpperCase())).toBe(true);
      expect(isValidUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });
  });

  describe('isValidDataType()', () => {
    it('should return true for valid data types', () => {
      expect(isValidDataType('record')).toBe(true);
      expect(isValidDataType('warning')).toBe(true);
      expect(isValidDataType('error')).toBe(true);
    });

    it('should return false for invalid data types', () => {
      const invalidTypes = [
        'info',
        'debug',
        'critical',
        'RECORD', // Case sensitive
        'Warning',
        'ERROR',
        'log',
        '',
        'record ',
        ' warning'
      ];

      invalidTypes.forEach(type => {
        expect(isValidDataType(type)).toBe(false);
      });
    });

    it('should be case-sensitive', () => {
      expect(isValidDataType('RECORD')).toBe(false);
      expect(isValidDataType('Warning')).toBe(false);
      expect(isValidDataType('ERROR')).toBe(false);
    });
  });
});
