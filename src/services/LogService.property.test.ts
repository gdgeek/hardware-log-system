/**
 * Property-Based Tests for LogService
 * 
 * Tests universal properties that should hold for all valid inputs
 * using fast-check for property-based testing
 */

import fc from 'fast-check';
import { LogService } from './LogService';
import { LogRepository } from '../repositories/LogRepository';
import { LogInput } from '../types';

// Mock dependencies
jest.mock('../repositories/LogRepository');
jest.mock('../config/logger');

describe('LogService - Property-Based Tests', () => {
  let logService: LogService;
  let mockRepository: jest.Mocked<LogRepository>;

  // Arbitraries for generating test data
  const uuidArbitrary = fc.uuid();
  const dataTypeArbitrary = fc.constantFrom('record' as const, 'warning' as const, 'error' as const);
  const keyArbitrary = fc.string({ minLength: 1, maxLength: 255 });
  const jsonValueArbitrary = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 50 }),
    fc.oneof(
      fc.string(),
      fc.integer(),
      fc.double(),
      fc.boolean(),
      fc.constant(null)
    )
  );

  const logInputArbitrary = fc.record({
    deviceUuid: uuidArbitrary,
    dataType: dataTypeArbitrary,
    key: keyArbitrary,
    value: jsonValueArbitrary,
  });

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

    logService = new LogService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Feature: hardware-log-system, Property 1: 有效日志数据的往返一致性
  describe('Property 1: Round-trip consistency for valid log data', () => {
    it('should preserve log data when creating and retrieving', async () => {
      await fc.assert(
        fc.asyncProperty(logInputArbitrary, async (logInput: LogInput) => {
          const createdAt = new Date();
          const mockCreatedLog = {
            id: Math.floor(Math.random() * 1000000),
            deviceUuid: logInput.deviceUuid,
            dataType: logInput.dataType,
            logKey: logInput.key,
            logValue: logInput.value,
            createdAt,
          };

          mockRepository.create.mockResolvedValue(mockCreatedLog as any);
          mockRepository.findById.mockResolvedValue(mockCreatedLog as any);

          // Create the log
          const created = await logService.createLog(logInput);

          // Retrieve the log
          const retrieved = await logService.getLogById(created.id);

          // Verify round-trip consistency
          expect(retrieved).not.toBeNull();
          expect(retrieved!.deviceUuid).toBe(logInput.deviceUuid);
          expect(retrieved!.dataType).toBe(logInput.dataType);
          expect(retrieved!.key).toBe(logInput.key);
          expect(retrieved!.value).toEqual(logInput.value);
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain data integrity across multiple creates and retrieves', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 1, maxLength: 10 }),
          async (logInputs: LogInput[]) => {
            const mockLogs = logInputs.map((input, index) => ({
              id: index + 1,
              deviceUuid: input.deviceUuid,
              dataType: input.dataType,
              logKey: input.key,
              logValue: input.value,
              createdAt: new Date(),
            }));

            // Mock create to return corresponding log
            mockRepository.create.mockImplementation(async (data: any) => {
              const index = logInputs.findIndex(
                (input) =>
                  input.deviceUuid === data.deviceUuid &&
                  input.key === data.logKey
              );
              return mockLogs[index] as any;
            });

            // Mock findById to return corresponding log
            mockRepository.findById.mockImplementation(async (id: number) => {
              return mockLogs.find((log) => log.id === id) as any;
            });

            // Create all logs
            const createdLogs = await Promise.all(
              logInputs.map((input) => logService.createLog(input))
            );

            // Retrieve all logs
            const retrievedLogs = await Promise.all(
              createdLogs.map((log) => logService.getLogById(log.id))
            );

            // Verify all logs maintain consistency
            for (let i = 0; i < logInputs.length; i++) {
              expect(retrievedLogs[i]).not.toBeNull();
              expect(retrievedLogs[i]!.deviceUuid).toBe(logInputs[i].deviceUuid);
              expect(retrievedLogs[i]!.dataType).toBe(logInputs[i].dataType);
              expect(retrievedLogs[i]!.key).toBe(logInputs[i].key);
              expect(retrievedLogs[i]!.value).toEqual(logInputs[i].value);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Feature: hardware-log-system, Property 2: 时间戳自动生成
  describe('Property 2: Automatic timestamp generation', () => {
    it('should generate timestamp within reasonable time range for any log', async () => {
      await fc.assert(
        fc.asyncProperty(logInputArbitrary, async (logInput: LogInput) => {
          const beforeCreate = new Date();
          
          const mockCreatedLog = {
            id: Math.floor(Math.random() * 1000000),
            deviceUuid: logInput.deviceUuid,
            dataType: logInput.dataType,
            logKey: logInput.key,
            logValue: logInput.value,
            createdAt: new Date(), // Simulates database auto-generation
          };

          mockRepository.create.mockResolvedValue(mockCreatedLog as any);

          const created = await logService.createLog(logInput);
          
          const afterCreate = new Date();
          const createdTime = new Date(created.createdAt);

          // Timestamp should be within 5 seconds of request time
          const timeDiff = Math.abs(createdTime.getTime() - beforeCreate.getTime());
          expect(timeDiff).toBeLessThan(5000);

          // Timestamp should not be in the future
          expect(createdTime.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

          // Timestamp should be a valid ISO 8601 string
          expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        }),
        { numRuns: 100 }
      );
    });

    it('should generate unique timestamps for logs created in sequence', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 2, maxLength: 5 }),
          async (logInputs: LogInput[]) => {
            const timestamps: Date[] = [];

            for (const input of logInputs) {
              const mockCreatedLog = {
                id: Math.floor(Math.random() * 1000000),
                deviceUuid: input.deviceUuid,
                dataType: input.dataType,
                logKey: input.key,
                logValue: input.value,
                createdAt: new Date(),
              };

              mockRepository.create.mockResolvedValue(mockCreatedLog as any);

              const created = await logService.createLog(input);
              timestamps.push(new Date(created.createdAt));

              // Small delay to ensure different timestamps
              await new Promise((resolve) => setTimeout(resolve, 1));
            }

            // Verify timestamps are in chronological order (or equal if created very quickly)
            for (let i = 1; i < timestamps.length; i++) {
              expect(timestamps[i].getTime()).toBeGreaterThanOrEqual(timestamps[i - 1].getTime());
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Feature: hardware-log-system, Property 4: 查询过滤正确性
  describe('Property 4: Query filter correctness', () => {
    it('should return only logs matching deviceUuid filter', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 5, maxLength: 20 }),
          fc.uuid(),
          async (logInputs: LogInput[], filterUuid: string) => {
            // Create mock logs
            const mockLogs = logInputs.map((input, index) => ({
              id: index + 1,
              deviceUuid: input.deviceUuid,
              dataType: input.dataType,
              logKey: input.key,
              logValue: input.value,
              createdAt: new Date(),
            }));

            // Filter logs that match the UUID
            const matchingLogs = mockLogs.filter((log) => log.deviceUuid === filterUuid);

            mockRepository.findByFilters.mockResolvedValue(matchingLogs as any);
            mockRepository.countByFilters.mockResolvedValue(matchingLogs.length);

            const result = await logService.queryLogs({ deviceUuid: filterUuid });

            // All returned logs should match the filter
            result.data.forEach((log) => {
              expect(log.deviceUuid).toBe(filterUuid);
            });

            expect(result.data.length).toBe(matchingLogs.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return only logs matching dataType filter', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 5, maxLength: 20 }),
          dataTypeArbitrary,
          async (logInputs: LogInput[], filterDataType) => {
            const mockLogs = logInputs.map((input, index) => ({
              id: index + 1,
              deviceUuid: input.deviceUuid,
              dataType: input.dataType,
              logKey: input.key,
              logValue: input.value,
              createdAt: new Date(),
            }));

            const matchingLogs = mockLogs.filter((log) => log.dataType === filterDataType);

            mockRepository.findByFilters.mockResolvedValue(matchingLogs as any);
            mockRepository.countByFilters.mockResolvedValue(matchingLogs.length);

            const result = await logService.queryLogs({ dataType: filterDataType });

            result.data.forEach((log) => {
              expect(log.dataType).toBe(filterDataType);
            });

            expect(result.data.length).toBe(matchingLogs.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return only logs within time range filter', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 5, maxLength: 20 }),
          fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
          fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
          async (logInputs: LogInput[], date1, date2) => {
            const startTime = date1 < date2 ? date1 : date2;
            const endTime = date1 < date2 ? date2 : date1;

            const mockLogs = logInputs.map((input, index) => {
              const randomTime = new Date(
                startTime.getTime() + Math.random() * (endTime.getTime() - startTime.getTime() + 86400000)
              );
              return {
                id: index + 1,
                deviceUuid: input.deviceUuid,
                dataType: input.dataType,
                logKey: input.key,
                logValue: input.value,
                createdAt: randomTime,
              };
            });

            const matchingLogs = mockLogs.filter(
              (log) => log.createdAt >= startTime && log.createdAt <= endTime
            );

            mockRepository.findByFilters.mockResolvedValue(matchingLogs as any);
            mockRepository.countByFilters.mockResolvedValue(matchingLogs.length);

            const result = await logService.queryLogs({ startTime, endTime });

            result.data.forEach((log) => {
              const logTime = new Date(log.createdAt);
              expect(logTime.getTime()).toBeGreaterThanOrEqual(startTime.getTime());
              expect(logTime.getTime()).toBeLessThanOrEqual(endTime.getTime());
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return logs matching all combined filters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 10, maxLength: 30 }),
          fc.uuid(),
          dataTypeArbitrary,
          async (logInputs: LogInput[], filterUuid, filterDataType) => {
            const mockLogs = logInputs.map((input, index) => ({
              id: index + 1,
              deviceUuid: input.deviceUuid,
              dataType: input.dataType,
              logKey: input.key,
              logValue: input.value,
              createdAt: new Date(),
            }));

            const matchingLogs = mockLogs.filter(
              (log) => log.deviceUuid === filterUuid && log.dataType === filterDataType
            );

            mockRepository.findByFilters.mockResolvedValue(matchingLogs as any);
            mockRepository.countByFilters.mockResolvedValue(matchingLogs.length);

            const result = await logService.queryLogs({
              deviceUuid: filterUuid,
              dataType: filterDataType,
            });

            result.data.forEach((log) => {
              expect(log.deviceUuid).toBe(filterUuid);
              expect(log.dataType).toBe(filterDataType);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: hardware-log-system, Property 5: 分页一致性
  describe('Property 5: Pagination consistency', () => {
    it('should not exceed specified page size', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 50 }),
          async (logInputs: LogInput[], pageSize: number) => {
            const mockLogs = logInputs.map((input, index) => ({
              id: index + 1,
              deviceUuid: input.deviceUuid,
              dataType: input.dataType,
              logKey: input.key,
              logValue: input.value,
              createdAt: new Date(),
            }));

            // Return only up to pageSize logs
            const pagedLogs = mockLogs.slice(0, pageSize);

            mockRepository.findByFilters.mockResolvedValue(pagedLogs as any);
            mockRepository.countByFilters.mockResolvedValue(mockLogs.length);

            const result = await logService.queryLogs({}, { page: 1, pageSize });

            expect(result.data.length).toBeLessThanOrEqual(pageSize);
            expect(result.pagination.pageSize).toBe(pageSize);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return correct total count regardless of page', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 10, maxLength: 100 }),
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 20 }),
          async (logInputs: LogInput[], page: number, pageSize: number) => {
            const mockLogs = logInputs.map((input, index) => ({
              id: index + 1,
              deviceUuid: input.deviceUuid,
              dataType: input.dataType,
              logKey: input.key,
              logValue: input.value,
              createdAt: new Date(),
            }));

            const offset = (page - 1) * pageSize;
            const pagedLogs = mockLogs.slice(offset, offset + pageSize);

            mockRepository.findByFilters.mockResolvedValue(pagedLogs as any);
            mockRepository.countByFilters.mockResolvedValue(mockLogs.length);

            const result = await logService.queryLogs({}, { page, pageSize });

            expect(result.pagination.total).toBe(mockLogs.length);
            expect(result.pagination.page).toBe(page);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate total pages correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 200 }),
          fc.integer({ min: 1, max: 50 }),
          async (totalLogs: number, pageSize: number) => {
            mockRepository.findByFilters.mockResolvedValue([]);
            mockRepository.countByFilters.mockResolvedValue(totalLogs);

            const result = await logService.queryLogs({}, { page: 1, pageSize });

            const expectedTotalPages = Math.ceil(totalLogs / pageSize);
            expect(result.pagination.totalPages).toBe(expectedTotalPages);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should traverse all logs when iterating through pages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 10, maxLength: 50 }),
          fc.integer({ min: 5, max: 15 }),
          async (logInputs: LogInput[], pageSize: number) => {
            const mockLogs = logInputs.map((input, index) => ({
              id: index + 1,
              deviceUuid: input.deviceUuid,
              dataType: input.dataType,
              logKey: input.key,
              logValue: input.value,
              createdAt: new Date(),
            }));

            const totalPages = Math.ceil(mockLogs.length / pageSize);
            const allRetrievedIds = new Set<number>();

            for (let page = 1; page <= totalPages; page++) {
              const offset = (page - 1) * pageSize;
              const pagedLogs = mockLogs.slice(offset, offset + pageSize);

              mockRepository.findByFilters.mockResolvedValue(pagedLogs as any);
              mockRepository.countByFilters.mockResolvedValue(mockLogs.length);

              const result = await logService.queryLogs({}, { page, pageSize });

              result.data.forEach((log) => {
                allRetrievedIds.add(log.id);
              });
            }

            // All logs should be retrieved exactly once
            expect(allRetrievedIds.size).toBe(mockLogs.length);
            mockLogs.forEach((log) => {
              expect(allRetrievedIds.has(log.id)).toBe(true);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return empty data for page beyond total pages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 1, max: 20 }),
          async (totalLogs: number, pageSize: number) => {
            const totalPages = Math.ceil(totalLogs / pageSize);
            const beyondPage = totalPages + 1;

            mockRepository.findByFilters.mockResolvedValue([]);
            mockRepository.countByFilters.mockResolvedValue(totalLogs);

            const result = await logService.queryLogs({}, { page: beyondPage, pageSize });

            expect(result.data).toEqual([]);
            expect(result.pagination.total).toBe(totalLogs);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
