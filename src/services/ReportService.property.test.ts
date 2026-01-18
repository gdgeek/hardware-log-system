/**
 * Property-Based Tests for ReportService
 * 
 * Tests universal properties that should hold for all valid inputs
 * using fast-check for property-based testing
 */

import fc from 'fast-check';
import { ReportService } from './ReportService';
import { LogRepository } from '../repositories/LogRepository';
import { DeviceReport, TimeRangeReport, ErrorReport } from '../types';

// Mock dependencies
jest.mock('../repositories/LogRepository');
jest.mock('../config/logger');

describe('ReportService - Property-Based Tests', () => {
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

  // Feature: hardware-log-system, Property 6: 统计计算正确性
  describe('Property 6: Statistics calculation correctness', () => {
    it('should ensure device report counts sum to total', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          async (uuid, recordCount, warningCount, errorCount) => {
            const totalLogs = recordCount + warningCount + errorCount;
            const mockReport: DeviceReport = {
              deviceUuid: uuid,
              totalLogs,
              recordCount,
              warningCount,
              errorCount,
              firstLogTime: new Date().toISOString(),
              lastLogTime: new Date().toISOString(),
            };

            mockRepository.aggregateByDevice.mockResolvedValue(mockReport);

            const result = await reportService.generateDeviceReport(uuid);

            // Total should equal sum of individual counts
            expect(result.totalLogs).toBe(result.recordCount + result.warningCount + result.errorCount);
            expect(result.totalLogs).toBe(totalLogs);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure time range report counts sum to total', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }),
          fc.date({ min: new Date('2024-06-01'), max: new Date('2024-12-31') }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          async (startTime, endTime, recordCount, warningCount, errorCount, deviceCount) => {
            const totalLogs = recordCount + warningCount + errorCount;
            const mockReport: TimeRangeReport = {
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              totalLogs,
              recordCount,
              warningCount,
              errorCount,
              deviceCount,
            };

            mockRepository.aggregateByTimeRange.mockResolvedValue(mockReport);

            const result = await reportService.generateTimeRangeReport(startTime, endTime);

            // Total should equal sum of individual counts
            expect(result.totalLogs).toBe(result.recordCount + result.warningCount + result.errorCount);
            expect(result.totalLogs).toBe(totalLogs);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure error report total matches sum of individual error counts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              deviceUuid: fc.uuid(),
              key: fc.string({ minLength: 1, maxLength: 50 }),
              count: fc.integer({ min: 1, max: 100 }),
              lastOccurrence: fc.date().map((d) => d.toISOString()),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          async (errors) => {
            const totalErrors = errors.reduce((sum, e) => sum + e.count, 0);
            const mockReport: ErrorReport = {
              errors,
              totalErrors,
            };

            mockRepository.aggregateErrors.mockResolvedValue(mockReport);

            const result = await reportService.generateErrorReport();

            // Total should equal sum of individual error counts
            const calculatedTotal = result.errors.reduce((sum, e) => sum + e.count, 0);
            expect(result.totalErrors).toBe(calculatedTotal);
            expect(result.totalErrors).toBe(totalErrors);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure all counts are non-negative in device report', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          async (uuid, recordCount, warningCount, errorCount) => {
            const totalLogs = recordCount + warningCount + errorCount;
            const mockReport: DeviceReport = {
              deviceUuid: uuid,
              totalLogs,
              recordCount,
              warningCount,
              errorCount,
              firstLogTime: new Date().toISOString(),
              lastLogTime: new Date().toISOString(),
            };

            mockRepository.aggregateByDevice.mockResolvedValue(mockReport);

            const result = await reportService.generateDeviceReport(uuid);

            expect(result.totalLogs).toBeGreaterThanOrEqual(0);
            expect(result.recordCount).toBeGreaterThanOrEqual(0);
            expect(result.warningCount).toBeGreaterThanOrEqual(0);
            expect(result.errorCount).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure device count does not exceed total logs in time range report', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }),
          fc.date({ min: new Date('2024-06-01'), max: new Date('2024-12-31') }),
          fc.integer({ min: 0, max: 1000 }),
          async (startTime, endTime, totalLogs) => {
            // Device count should be reasonable (at most totalLogs, but typically much less)
            const deviceCount = totalLogs > 0 ? Math.min(totalLogs, Math.floor(Math.random() * 100) + 1) : 0;
            const recordCount = Math.floor(totalLogs * 0.6);
            const warningCount = Math.floor(totalLogs * 0.3);
            const errorCount = totalLogs - recordCount - warningCount;

            const mockReport: TimeRangeReport = {
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              totalLogs,
              recordCount,
              warningCount,
              errorCount,
              deviceCount,
            };

            mockRepository.aggregateByTimeRange.mockResolvedValue(mockReport);

            const result = await reportService.generateTimeRangeReport(startTime, endTime);

            // If there are logs, there must be at least one device
            if (result.totalLogs > 0) {
              expect(result.deviceCount).toBeGreaterThan(0);
            } else {
              expect(result.deviceCount).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: hardware-log-system, Property 7: 报表 JSON 格式有效性
  describe('Property 7: Report JSON format validity', () => {
    it('should return valid JSON structure for device report', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          async (uuid, recordCount, warningCount, errorCount) => {
            const totalLogs = recordCount + warningCount + errorCount;
            const mockReport: DeviceReport = {
              deviceUuid: uuid,
              totalLogs,
              recordCount,
              warningCount,
              errorCount,
              firstLogTime: totalLogs > 0 ? new Date().toISOString() : '',
              lastLogTime: totalLogs > 0 ? new Date().toISOString() : '',
            };

            mockRepository.aggregateByDevice.mockResolvedValue(mockReport);

            const result = await reportService.generateDeviceReport(uuid);

            // Verify all required fields are present
            expect(result).toHaveProperty('deviceUuid');
            expect(result).toHaveProperty('totalLogs');
            expect(result).toHaveProperty('recordCount');
            expect(result).toHaveProperty('warningCount');
            expect(result).toHaveProperty('errorCount');
            expect(result).toHaveProperty('firstLogTime');
            expect(result).toHaveProperty('lastLogTime');

            // Verify types
            expect(typeof result.deviceUuid).toBe('string');
            expect(typeof result.totalLogs).toBe('number');
            expect(typeof result.recordCount).toBe('number');
            expect(typeof result.warningCount).toBe('number');
            expect(typeof result.errorCount).toBe('number');
            expect(typeof result.firstLogTime).toBe('string');
            expect(typeof result.lastLogTime).toBe('string');

            // Verify JSON serialization works
            const jsonString = JSON.stringify(result);
            const parsed = JSON.parse(jsonString);
            expect(parsed).toEqual(result);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return valid JSON structure for time range report', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }),
          fc.date({ min: new Date('2024-06-01'), max: new Date('2024-12-31') }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          async (startTime, endTime, recordCount, warningCount, errorCount, deviceCount) => {
            const totalLogs = recordCount + warningCount + errorCount;
            const mockReport: TimeRangeReport = {
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              totalLogs,
              recordCount,
              warningCount,
              errorCount,
              deviceCount,
            };

            mockRepository.aggregateByTimeRange.mockResolvedValue(mockReport);

            const result = await reportService.generateTimeRangeReport(startTime, endTime);

            // Verify all required fields are present
            expect(result).toHaveProperty('startTime');
            expect(result).toHaveProperty('endTime');
            expect(result).toHaveProperty('totalLogs');
            expect(result).toHaveProperty('recordCount');
            expect(result).toHaveProperty('warningCount');
            expect(result).toHaveProperty('errorCount');
            expect(result).toHaveProperty('deviceCount');

            // Verify types
            expect(typeof result.startTime).toBe('string');
            expect(typeof result.endTime).toBe('string');
            expect(typeof result.totalLogs).toBe('number');
            expect(typeof result.recordCount).toBe('number');
            expect(typeof result.warningCount).toBe('number');
            expect(typeof result.errorCount).toBe('number');
            expect(typeof result.deviceCount).toBe('number');

            // Verify ISO 8601 date format
            expect(result.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            expect(result.endTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

            // Verify JSON serialization works
            const jsonString = JSON.stringify(result);
            const parsed = JSON.parse(jsonString);
            expect(parsed).toEqual(result);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return valid JSON structure for error report', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              deviceUuid: fc.uuid(),
              key: fc.string({ minLength: 1, maxLength: 50 }),
              count: fc.integer({ min: 1, max: 100 }),
              lastOccurrence: fc.date().map((d) => d.toISOString()),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          async (errors) => {
            const totalErrors = errors.reduce((sum, e) => sum + e.count, 0);
            const mockReport: ErrorReport = {
              errors,
              totalErrors,
            };

            mockRepository.aggregateErrors.mockResolvedValue(mockReport);

            const result = await reportService.generateErrorReport();

            // Verify all required fields are present
            expect(result).toHaveProperty('errors');
            expect(result).toHaveProperty('totalErrors');

            // Verify types
            expect(Array.isArray(result.errors)).toBe(true);
            expect(typeof result.totalErrors).toBe('number');

            // Verify each error entry has required fields
            result.errors.forEach((error) => {
              expect(error).toHaveProperty('deviceUuid');
              expect(error).toHaveProperty('key');
              expect(error).toHaveProperty('count');
              expect(error).toHaveProperty('lastOccurrence');

              expect(typeof error.deviceUuid).toBe('string');
              expect(typeof error.key).toBe('string');
              expect(typeof error.count).toBe('number');
              expect(typeof error.lastOccurrence).toBe('string');

              // Verify ISO 8601 date format
              expect(error.lastOccurrence).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            });

            // Verify JSON serialization works
            const jsonString = JSON.stringify(result);
            const parsed = JSON.parse(jsonString);
            expect(parsed).toEqual(result);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty reports with valid JSON structure', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (uuid) => {
          const emptyDeviceReport: DeviceReport = {
            deviceUuid: uuid,
            totalLogs: 0,
            recordCount: 0,
            warningCount: 0,
            errorCount: 0,
            firstLogTime: '',
            lastLogTime: '',
          };

          mockRepository.aggregateByDevice.mockResolvedValue(emptyDeviceReport);

          const result = await reportService.generateDeviceReport(uuid);

          // Should still be valid JSON
          const jsonString = JSON.stringify(result);
          const parsed = JSON.parse(jsonString);
          expect(parsed).toEqual(result);
        }),
        { numRuns: 50 }
      );
    });

    it('should produce consistent JSON output for same input', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (uuid) => {
          const mockReport: DeviceReport = {
            deviceUuid: uuid,
            totalLogs: 100,
            recordCount: 60,
            warningCount: 30,
            errorCount: 10,
            firstLogTime: '2024-01-01T00:00:00.000Z',
            lastLogTime: '2024-01-31T23:59:59.000Z',
          };

          mockRepository.aggregateByDevice.mockResolvedValue(mockReport);

          const result1 = await reportService.generateDeviceReport(uuid);
          const result2 = await reportService.generateDeviceReport(uuid);

          // Same input should produce same output
          expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
        }),
        { numRuns: 50 }
      );
    });
  });
});
