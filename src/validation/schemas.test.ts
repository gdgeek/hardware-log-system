/**
 * Unit tests for validation schemas
 * 
 * Tests validation of:
 * - LogInput (UUID, dataType, key, value)
 * - Query filters
 * - Pagination parameters
 * 
 * Requirements: 1.3, 1.4, 1.5
 */

import {
  logInputSchema,
  logFiltersSchema,
  paginationSchema,
  deviceUuidParamSchema,
  timeRangeQuerySchema,
  logIdParamSchema
} from './schemas';

describe('Validation Schemas', () => {
  describe('logInputSchema', () => {
    describe('valid inputs', () => {
      it('should accept valid log input with all required fields', () => {
        const validInput = {
          deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'record',
          key: 'temperature',
          value: { temp: 25.5, unit: 'celsius' }
        };

        const { error, value } = logInputSchema.validate(validInput);
        expect(error).toBeUndefined();
        expect(value).toEqual(validInput);
      });

      it('should accept all valid dataType values', () => {
        const dataTypes = ['record', 'warning', 'error'];
        
        dataTypes.forEach(dataType => {
          const input = {
            deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
            dataType,
            key: 'test',
            value: { data: 'test' }
          };

          const { error } = logInputSchema.validate(input);
          expect(error).toBeUndefined();
        });
      });

      it('should accept key with maximum length of 255 characters', () => {
        const input = {
          deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'record',
          key: 'a'.repeat(255),
          value: { data: 'test' }
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeUndefined();
      });

      it('should accept complex nested JSON objects as value', () => {
        const input = {
          deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'record',
          key: 'sensor_data',
          value: {
            temperature: 25.5,
            humidity: 60,
            location: {
              lat: 40.7128,
              lng: -74.0060
            },
            readings: [1, 2, 3, 4, 5]
          }
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeUndefined();
      });

      it('should strip unknown fields', () => {
        const input = {
          deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'record',
          key: 'test',
          value: { data: 'test' },
          unknownField: 'should be removed'
        };

        const { error, value } = logInputSchema.validate(input);
        expect(error).toBeUndefined();
        expect(value).not.toHaveProperty('unknownField');
      });
    });

    describe('invalid deviceUuid', () => {
      it('should reject missing deviceUuid', () => {
        const input = {
          dataType: 'record',
          key: 'test',
          value: { data: 'test' }
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeDefined();
        expect(error?.details[0].path).toContain('deviceUuid');
        expect(error?.details[0].message).toContain('required');
      });

      it('should reject empty deviceUuid', () => {
        const input = {
          deviceUuid: '',
          dataType: 'record',
          key: 'test',
          value: { data: 'test' }
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeDefined();
        expect(error?.details[0].message).toContain('cannot be empty');
      });

      it('should reject invalid UUID format', () => {
        const invalidUuids = [
          'not-a-uuid',
          '12345678-1234-1234-1234-123456789012', // Not v4
          '550e8400-e29b-31d4-a716-446655440000', // Wrong version (3 instead of 4)
          '550e8400-e29b-41d4-c716-446655440000', // Wrong variant
          'g50e8400-e29b-41d4-a716-446655440000', // Invalid character
          '550e8400e29b41d4a716446655440000' // Missing hyphens
        ];

        invalidUuids.forEach(uuid => {
          const input = {
            deviceUuid: uuid,
            dataType: 'record',
            key: 'test',
            value: { data: 'test' }
          };

          const { error } = logInputSchema.validate(input);
          expect(error).toBeDefined();
          expect(error?.details[0].message).toContain('valid UUID v4 format');
        });
      });
    });

    describe('invalid dataType', () => {
      it('should reject missing dataType', () => {
        const input = {
          deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
          key: 'test',
          value: { data: 'test' }
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeDefined();
        expect(error?.details[0].path).toContain('dataType');
        expect(error?.details[0].message).toContain('required');
      });

      it('should reject empty dataType', () => {
        const input = {
          deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
          dataType: '',
          key: 'test',
          value: { data: 'test' }
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeDefined();
        expect(error?.details[0].message).toContain('cannot be empty');
      });

      it('should reject invalid dataType values', () => {
        const invalidDataTypes = ['info', 'debug', 'critical', 'RECORD', 'Warning'];

        invalidDataTypes.forEach(dataType => {
          const input = {
            deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
            dataType,
            key: 'test',
            value: { data: 'test' }
          };

          const { error } = logInputSchema.validate(input);
          expect(error).toBeDefined();
          expect(error?.details[0].message).toContain('must be one of: record, warning, error');
        });
      });
    });

    describe('invalid key', () => {
      it('should reject missing key', () => {
        const input = {
          deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'record',
          value: { data: 'test' }
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeDefined();
        expect(error?.details[0].path).toContain('key');
        expect(error?.details[0].message).toContain('required');
      });

      it('should reject empty key', () => {
        const input = {
          deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'record',
          key: '',
          value: { data: 'test' }
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeDefined();
        expect(error?.details[0].message).toContain('cannot be empty');
      });

      it('should reject key exceeding 255 characters', () => {
        const input = {
          deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'record',
          key: 'a'.repeat(256),
          value: { data: 'test' }
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeDefined();
        expect(error?.details[0].message).toContain('must not exceed 255 characters');
      });
    });

    describe('invalid value', () => {
      it('should reject missing value', () => {
        const input = {
          deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
          dataType: 'record',
          key: 'test'
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeDefined();
        expect(error?.details[0].path).toContain('value');
        expect(error?.details[0].message).toContain('required');
      });

      it('should reject non-object value types', () => {
        const invalidValues = [
          'string',
          123,
          true,
          null,
          undefined,
          []
        ];

        invalidValues.forEach(value => {
          const input = {
            deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
            dataType: 'record',
            key: 'test',
            value
          };

          const { error } = logInputSchema.validate(input);
          expect(error).toBeDefined();
          expect(error?.details[0].message).toContain('must be a valid JSON object');
        });
      });
    });

    describe('multiple validation errors', () => {
      it('should report all validation errors at once', () => {
        const input = {
          deviceUuid: 'invalid-uuid',
          dataType: 'invalid-type',
          key: '',
          value: 'not-an-object'
        };

        const { error } = logInputSchema.validate(input, { abortEarly: false });
        expect(error).toBeDefined();
        expect(error?.details.length).toBeGreaterThan(1);
      });
    });
  });

  describe('logFiltersSchema', () => {
    it('should accept valid filters with all fields', () => {
      const filters = {
        deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
        dataType: 'error',
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-31T23:59:59.999Z'
      };

      const { error } = logFiltersSchema.validate(filters);
      expect(error).toBeUndefined();
    });

    it('should accept empty filters', () => {
      const { error } = logFiltersSchema.validate({});
      expect(error).toBeUndefined();
    });

    it('should accept partial filters', () => {
      const filters = {
        deviceUuid: '550e8400-e29b-41d4-a716-446655440000'
      };

      const { error } = logFiltersSchema.validate(filters);
      expect(error).toBeUndefined();
    });

    it('should reject invalid UUID in filters', () => {
      const filters = {
        deviceUuid: 'invalid-uuid'
      };

      const { error } = logFiltersSchema.validate(filters);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('valid UUID v4 format');
    });

    it('should reject invalid dataType in filters', () => {
      const filters = {
        dataType: 'invalid'
      };

      const { error } = logFiltersSchema.validate(filters);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('must be one of: record, warning, error');
    });

    it('should reject invalid date formats', () => {
      const filters = {
        startTime: 'not-a-date'
      };

      const { error } = logFiltersSchema.validate(filters);
      expect(error).toBeDefined();
    });
  });

  describe('paginationSchema', () => {
    it('should accept valid pagination parameters', () => {
      const pagination = {
        page: 1,
        pageSize: 20
      };

      const { error, value } = paginationSchema.validate(pagination);
      expect(error).toBeUndefined();
      expect(value).toEqual(pagination);
    });

    it('should use default values when not provided', () => {
      const { error, value } = paginationSchema.validate({});
      expect(error).toBeUndefined();
      expect(value.page).toBe(1);
      expect(value.pageSize).toBe(20);
    });

    it('should accept maximum pageSize of 100', () => {
      const pagination = {
        page: 1,
        pageSize: 100
      };

      const { error } = paginationSchema.validate(pagination);
      expect(error).toBeUndefined();
    });

    it('should reject page less than 1', () => {
      const pagination = {
        page: 0,
        pageSize: 20
      };

      const { error } = paginationSchema.validate(pagination);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('must be at least 1');
    });

    it('should reject pageSize less than 1', () => {
      const pagination = {
        page: 1,
        pageSize: 0
      };

      const { error } = paginationSchema.validate(pagination);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('must be at least 1');
    });

    it('should reject pageSize greater than 100', () => {
      const pagination = {
        page: 1,
        pageSize: 101
      };

      const { error } = paginationSchema.validate(pagination);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('must not exceed 100');
    });

    it('should reject non-integer values', () => {
      const pagination = {
        page: 1.5,
        pageSize: 20.7
      };

      const { error } = paginationSchema.validate(pagination);
      expect(error).toBeDefined();
    });

    it('should convert string numbers to integers', () => {
      const pagination = {
        page: '2',
        pageSize: '50'
      };

      const { error, value } = paginationSchema.validate(pagination);
      expect(error).toBeUndefined();
      expect(value.page).toBe(2);
      expect(value.pageSize).toBe(50);
      expect(typeof value.page).toBe('number');
      expect(typeof value.pageSize).toBe('number');
    });
  });

  describe('deviceUuidParamSchema', () => {
    it('should accept valid UUID parameter', () => {
      const param = {
        uuid: '550e8400-e29b-41d4-a716-446655440000'
      };

      const { error } = deviceUuidParamSchema.validate(param);
      expect(error).toBeUndefined();
    });

    it('should reject invalid UUID', () => {
      const param = {
        uuid: 'invalid-uuid'
      };

      const { error } = deviceUuidParamSchema.validate(param);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('valid UUID v4 format');
    });

    it('should reject missing UUID', () => {
      const { error } = deviceUuidParamSchema.validate({});
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('required');
    });
  });

  describe('timeRangeQuerySchema', () => {
    it('should accept valid time range', () => {
      const query = {
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-31T23:59:59.999Z'
      };

      const { error } = timeRangeQuerySchema.validate(query);
      expect(error).toBeUndefined();
    });

    it('should reject when endTime is before startTime', () => {
      const query = {
        startTime: '2024-01-31T23:59:59.999Z',
        endTime: '2024-01-01T00:00:00.000Z'
      };

      const { error } = timeRangeQuerySchema.validate(query);
      expect(error).toBeDefined();
    });

    it('should reject when endTime equals startTime', () => {
      const query = {
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-01T00:00:00.000Z'
      };

      const { error } = timeRangeQuerySchema.validate(query);
      expect(error).toBeDefined();
    });

    it('should reject missing startTime', () => {
      const query = {
        endTime: '2024-01-31T23:59:59.999Z'
      };

      const { error } = timeRangeQuerySchema.validate(query);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('startTime');
    });

    it('should reject missing endTime', () => {
      const query = {
        startTime: '2024-01-01T00:00:00.000Z'
      };

      const { error } = timeRangeQuerySchema.validate(query);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('endTime');
    });
  });

  describe('logIdParamSchema', () => {
    it('should accept valid log ID', () => {
      const param = {
        id: 123
      };

      const { error } = logIdParamSchema.validate(param);
      expect(error).toBeUndefined();
    });

    it('should convert string ID to number', () => {
      const param = {
        id: '123'
      };

      const { error, value } = logIdParamSchema.validate(param);
      expect(error).toBeUndefined();
      expect(value.id).toBe(123);
      expect(typeof value.id).toBe('number');
    });

    it('should reject negative ID', () => {
      const param = {
        id: -1
      };

      const { error } = logIdParamSchema.validate(param);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('must be a positive number');
    });

    it('should reject zero ID', () => {
      const param = {
        id: 0
      };

      const { error } = logIdParamSchema.validate(param);
      expect(error).toBeDefined();
    });

    it('should reject non-integer ID', () => {
      const param = {
        id: 123.45
      };

      const { error } = logIdParamSchema.validate(param);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('must be an integer');
    });

    it('should reject missing ID', () => {
      const { error } = logIdParamSchema.validate({});
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('required');
    });
  });
});
