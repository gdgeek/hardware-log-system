/**
 * Unit tests for ReportService
 */

import { ReportService } from './ReportService';
import { LogRepository } from '../repositories/LogRepository';
import { DeviceReport, TimeRangeReport, ErrorReport, ValidationError } from '../types';

// Mock the repository
jest.mock('../repositories/LogRepository');
jest.mock('../config/logger');

describe('ReportService', () => {
  let reportService: ReportService;
  let mockRepository: jest.Mocked<LogRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByFilters: jest.fn(),
      countByFilters: jest.fn(),
      aggregateByDevice: jest.fn(),
      aggregateByTimeRange: jest.fn(),
      aggregateErrors: jest.fn(),
    } as any;

    reportService = new ReportService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDeviceReport', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('should generate device report with valid UUID', async () => {
      const mockReport: DeviceReport = {
        deviceUuid: validUuid,
        totalLogs: 100,
        recordCount: 60,
        warningCount: 30,
        errorCount: 10,
        firstLogTime: '2024-01-01T00:00:00.000Z',
        lastLogTime: '2024-01-31T23:59:59.000Z',
      };

      mockRepository.aggregateByDevice.mockResolvedValue(mockReport);

      const result = await reportService.generateDeviceReport(validUuid);

      expect(result).toEqual(mockReport);
      expect(mockRepository.aggregateByDevice).toHaveBeenCalledWith(validUuid);
    });

    it('should return empty report for device with no logs', async () => {
      const emptyReport: DeviceReport = {
        deviceUuid: validUuid,
        totalLogs: 0,
        recordCount: 0,
        warningCount: 0,
        errorCount: 0,
        firstLogTime: '',
        lastLogTime: '',
      };

      mockRepository.aggregateByDevice.mockResolvedValue(emptyReport);

      const result = await reportService.generateDeviceReport(validUuid);

      expect(result).toEqual(emptyReport);
      expect(result.totalLogs).toBe(0);
    });

    it('should reject invalid UUID format', async () => {
      await expect(reportService.generateDeviceReport('invalid-uuid')).rejects.toThrow(
        ValidationError
      );
    });

    it('should reject empty UUID', async () => {
      await expect(reportService.generateDeviceReport('')).rejects.toThrow(ValidationError);
    });
  });

  describe('generateTimeRangeReport', () => {
    const startTime = new Date('2024-01-01T00:00:00Z');
    const endTime = new Date('2024-01-31T23:59:59Z');

    it('should generate time range report with valid dates', async () => {
      const mockReport: TimeRangeReport = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        totalLogs: 500,
        recordCount: 300,
        warningCount: 150,
        errorCount: 50,
        deviceCount: 10,
      };

      mockRepository.aggregateByTimeRange.mockResolvedValue(mockReport);

      const result = await reportService.generateTimeRangeReport(startTime, endTime);

      expect(result).toEqual(mockReport);
      expect(mockRepository.aggregateByTimeRange).toHaveBeenCalledWith(startTime, endTime);
    });

    it('should return empty report for time range with no logs', async () => {
      const emptyReport: TimeRangeReport = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        totalLogs: 0,
        recordCount: 0,
        warningCount: 0,
        errorCount: 0,
        deviceCount: 0,
      };

      mockRepository.aggregateByTimeRange.mockResolvedValue(emptyReport);

      const result = await reportService.generateTimeRangeReport(startTime, endTime);

      expect(result).toEqual(emptyReport);
      expect(result.totalLogs).toBe(0);
    });

    it('should reject when endTime is before startTime', async () => {
      const invalidStart = new Date('2024-01-31T00:00:00Z');
      const invalidEnd = new Date('2024-01-01T00:00:00Z');

      await expect(
        reportService.generateTimeRangeReport(invalidStart, invalidEnd)
      ).rejects.toThrow(ValidationError);
    });

    it('should accept same startTime and endTime', async () => {
      const sameTime = new Date('2024-01-01T12:00:00Z');
      const mockReport: TimeRangeReport = {
        startTime: sameTime.toISOString(),
        endTime: sameTime.toISOString(),
        totalLogs: 5,
        recordCount: 3,
        warningCount: 1,
        errorCount: 1,
        deviceCount: 2,
      };

      mockRepository.aggregateByTimeRange.mockResolvedValue(mockReport);

      // This should be rejected by validation
      await expect(
        reportService.generateTimeRangeReport(sameTime, sameTime)
      ).rejects.toThrow(ValidationError);
    });

    it('should handle very short time ranges', async () => {
      const start = new Date('2024-01-01T12:00:00Z');
      const end = new Date('2024-01-01T12:00:01Z'); // 1 second later

      const mockReport: TimeRangeReport = {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        totalLogs: 1,
        recordCount: 1,
        warningCount: 0,
        errorCount: 0,
        deviceCount: 1,
      };

      mockRepository.aggregateByTimeRange.mockResolvedValue(mockReport);

      const result = await reportService.generateTimeRangeReport(start, end);

      expect(result).toEqual(mockReport);
    });
  });

  describe('generateErrorReport', () => {
    it('should generate error report with errors', async () => {
      const mockReport: ErrorReport = {
        errors: [
          {
            deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
            key: 'connection_error',
            count: 15,
            lastOccurrence: '2024-01-31T23:59:59.000Z',
          },
          {
            deviceUuid: '550e8400-e29b-41d4-a716-446655440001',
            key: 'sensor_failure',
            count: 8,
            lastOccurrence: '2024-01-31T20:00:00.000Z',
          },
        ],
        totalErrors: 23,
      };

      mockRepository.aggregateErrors.mockResolvedValue(mockReport);

      const result = await reportService.generateErrorReport();

      expect(result).toEqual(mockReport);
      expect(result.errors).toHaveLength(2);
      expect(result.totalErrors).toBe(23);
      expect(mockRepository.aggregateErrors).toHaveBeenCalled();
    });

    it('should return empty report when no errors exist', async () => {
      const emptyReport: ErrorReport = {
        errors: [],
        totalErrors: 0,
      };

      mockRepository.aggregateErrors.mockResolvedValue(emptyReport);

      const result = await reportService.generateErrorReport();

      expect(result).toEqual(emptyReport);
      expect(result.errors).toHaveLength(0);
      expect(result.totalErrors).toBe(0);
    });

    it('should handle single error', async () => {
      const singleErrorReport: ErrorReport = {
        errors: [
          {
            deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
            key: 'critical_error',
            count: 1,
            lastOccurrence: '2024-01-31T23:59:59.000Z',
          },
        ],
        totalErrors: 1,
      };

      mockRepository.aggregateErrors.mockResolvedValue(singleErrorReport);

      const result = await reportService.generateErrorReport();

      expect(result.errors).toHaveLength(1);
      expect(result.totalErrors).toBe(1);
    });

    it('should handle large number of errors', async () => {
      const errors = Array.from({ length: 100 }, (_, i) => ({
        deviceUuid: `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`,
        key: `error_${i}`,
        count: i + 1,
        lastOccurrence: '2024-01-31T23:59:59.000Z',
      }));

      const largeReport: ErrorReport = {
        errors,
        totalErrors: errors.reduce((sum, e) => sum + e.count, 0),
      };

      mockRepository.aggregateErrors.mockResolvedValue(largeReport);

      const result = await reportService.generateErrorReport();

      expect(result.errors).toHaveLength(100);
      expect(result.totalErrors).toBeGreaterThan(0);
    });
  });
});
