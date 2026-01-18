/**
 * Unit tests for LogService
 */

import { LogService } from './LogService';
import { LogRepository } from '../repositories/LogRepository';
import { LogInput, ValidationError } from '../types';
import { Log } from '../models/Log';

// Mock the repository
jest.mock('../repositories/LogRepository');
jest.mock('../config/logger');

describe('LogService', () => {
  let logService: LogService;
  let mockRepository: jest.Mocked<LogRepository>;

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByFilters: jest.fn(),
      countByFilters: jest.fn(),
      aggregateByDevice: jest.fn(),
      aggregateByTimeRange: jest.fn(),
      aggregateErrors: jest.fn(),
    } as any;

    logService = new LogService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createLog', () => {
    const validLogInput: LogInput = {
      deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
      dataType: 'record',
      key: 'temperature',
      value: { temp: 25.5, unit: 'celsius' },
    };

    it('should create a log with valid input', async () => {
      const mockLog = {
        id: 1,
        deviceUuid: validLogInput.deviceUuid,
        dataType: validLogInput.dataType,
        logKey: validLogInput.key,
        logValue: validLogInput.value,
        createdAt: new Date('2024-01-01T12:00:00Z'),
      };

      mockRepository.create.mockResolvedValue(mockLog as any);

      const result = await logService.createLog(validLogInput);

      expect(result).toEqual({
        id: 1,
        deviceUuid: validLogInput.deviceUuid,
        dataType: validLogInput.dataType,
        key: validLogInput.key,
        value: validLogInput.value,
        createdAt: '2024-01-01T12:00:00.000Z',
      });

      expect(mockRepository.create).toHaveBeenCalledWith({
        deviceUuid: validLogInput.deviceUuid,
        dataType: validLogInput.dataType,
        logKey: validLogInput.key,
        logValue: validLogInput.value,
      });
    });

    it('should reject log with missing deviceUuid', async () => {
      const invalidInput = {
        dataType: 'record',
        key: 'test',
        value: { data: 'test' },
      } as any;

      await expect(logService.createLog(invalidInput)).rejects.toThrow(ValidationError);
    });

    it('should reject log with invalid UUID format', async () => {
      const invalidInput = {
        ...validLogInput,
        deviceUuid: 'invalid-uuid',
      };

      await expect(logService.createLog(invalidInput)).rejects.toThrow(ValidationError);
    });

    it('should reject log with invalid dataType', async () => {
      const invalidInput = {
        ...validLogInput,
        dataType: 'invalid' as any,
      };

      await expect(logService.createLog(invalidInput)).rejects.toThrow(ValidationError);
    });

    it('should reject log with missing key', async () => {
      const invalidInput = {
        deviceUuid: validLogInput.deviceUuid,
        dataType: 'record',
        value: { data: 'test' },
      } as any;

      await expect(logService.createLog(invalidInput)).rejects.toThrow(ValidationError);
    });

    it('should reject log with key exceeding 255 characters', async () => {
      const invalidInput = {
        ...validLogInput,
        key: 'a'.repeat(256),
      };

      await expect(logService.createLog(invalidInput)).rejects.toThrow(ValidationError);
    });

    it('should reject log with non-object value', async () => {
      const invalidInput = {
        ...validLogInput,
        value: 'not an object' as any,
      };

      await expect(logService.createLog(invalidInput)).rejects.toThrow(ValidationError);
    });

    it('should accept all valid dataTypes', async () => {
      const dataTypes: Array<'record' | 'warning' | 'error'> = ['record', 'warning', 'error'];

      for (const dataType of dataTypes) {
        const input = { ...validLogInput, dataType };
        const mockLog = {
          id: 1,
          deviceUuid: input.deviceUuid,
          dataType: input.dataType,
          logKey: input.key,
          logValue: input.value,
          createdAt: new Date(),
        };

        mockRepository.create.mockResolvedValue(mockLog as any);

        await expect(logService.createLog(input)).resolves.toBeDefined();
      }
    });
  });

  describe('getLogById', () => {
    it('should return log when found', async () => {
      const mockLog = {
        id: 1,
        deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
        dataType: 'record',
        logKey: 'temperature',
        logValue: { temp: 25.5 },
        createdAt: new Date('2024-01-01T12:00:00Z'),
      };

      mockRepository.findById.mockResolvedValue(mockLog as any);

      const result = await logService.getLogById(1);

      expect(result).toEqual({
        id: 1,
        deviceUuid: mockLog.deviceUuid,
        dataType: mockLog.dataType,
        key: mockLog.logKey,
        value: mockLog.logValue,
        createdAt: '2024-01-01T12:00:00.000Z',
      });

      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should return null when log not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await logService.getLogById(999);

      expect(result).toBeNull();
      expect(mockRepository.findById).toHaveBeenCalledWith(999);
    });
  });

  describe('queryLogs', () => {
    const mockLogs = [
      {
        id: 1,
        deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
        dataType: 'record',
        logKey: 'temp',
        logValue: { value: 25 },
        createdAt: new Date('2024-01-01T12:00:00Z'),
      },
      {
        id: 2,
        deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
        dataType: 'warning',
        logKey: 'temp',
        logValue: { value: 30 },
        createdAt: new Date('2024-01-01T13:00:00Z'),
      },
    ];

    it('should return paginated results with default pagination', async () => {
      mockRepository.findByFilters.mockResolvedValue(mockLogs as any);
      mockRepository.countByFilters.mockResolvedValue(2);

      const result = await logService.queryLogs();

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
      });

      expect(mockRepository.findByFilters).toHaveBeenCalledWith({}, { page: 1, pageSize: 20 });
      expect(mockRepository.countByFilters).toHaveBeenCalledWith({});
    });

    it('should filter by deviceUuid', async () => {
      const filters = { deviceUuid: '550e8400-e29b-41d4-a716-446655440000' };
      mockRepository.findByFilters.mockResolvedValue(mockLogs as any);
      mockRepository.countByFilters.mockResolvedValue(2);

      await logService.queryLogs(filters);

      expect(mockRepository.findByFilters).toHaveBeenCalledWith(
        filters,
        { page: 1, pageSize: 20 }
      );
    });

    it('should filter by dataType', async () => {
      const filters = { dataType: 'error' as const };
      mockRepository.findByFilters.mockResolvedValue([mockLogs[0]] as any);
      mockRepository.countByFilters.mockResolvedValue(1);

      await logService.queryLogs(filters);

      expect(mockRepository.findByFilters).toHaveBeenCalledWith(
        filters,
        { page: 1, pageSize: 20 }
      );
    });

    it('should filter by time range', async () => {
      const filters = {
        startTime: new Date('2024-01-01T00:00:00Z'),
        endTime: new Date('2024-01-02T00:00:00Z'),
      };
      mockRepository.findByFilters.mockResolvedValue(mockLogs as any);
      mockRepository.countByFilters.mockResolvedValue(2);

      await logService.queryLogs(filters);

      expect(mockRepository.findByFilters).toHaveBeenCalledWith(
        filters,
        { page: 1, pageSize: 20 }
      );
    });

    it('should handle custom pagination', async () => {
      const pagination = { page: 2, pageSize: 10 };
      mockRepository.findByFilters.mockResolvedValue([mockLogs[0]] as any);
      mockRepository.countByFilters.mockResolvedValue(15);

      const result = await logService.queryLogs({}, pagination);

      expect(result.pagination).toEqual({
        page: 2,
        pageSize: 10,
        total: 15,
        totalPages: 2,
      });

      expect(mockRepository.findByFilters).toHaveBeenCalledWith({}, pagination);
    });

    it('should return empty results when no logs match', async () => {
      mockRepository.findByFilters.mockResolvedValue([]);
      mockRepository.countByFilters.mockResolvedValue(0);

      const result = await logService.queryLogs({ deviceUuid: '550e8400-e29b-41d4-a716-446655440001' });

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should reject invalid pagination parameters', async () => {
      const invalidPagination = { page: 0, pageSize: 10 };

      await expect(logService.queryLogs({}, invalidPagination)).rejects.toThrow(ValidationError);
    });

    it('should reject pageSize exceeding maximum', async () => {
      const invalidPagination = { page: 1, pageSize: 101 };

      await expect(logService.queryLogs({}, invalidPagination)).rejects.toThrow(ValidationError);
    });

    it('should calculate totalPages correctly', async () => {
      mockRepository.findByFilters.mockResolvedValue(mockLogs as any);
      mockRepository.countByFilters.mockResolvedValue(25);

      const result = await logService.queryLogs({}, { page: 1, pageSize: 10 });

      expect(result.pagination.totalPages).toBe(3);
    });
  });
});
