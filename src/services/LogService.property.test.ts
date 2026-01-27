/**
 * Property-Based Tests for LogService
 */

import fc from "fast-check";
import { LogService } from "./LogService";
import { LogRepository } from "../repositories/LogRepository";
import { LogInput } from "../types";

jest.mock("../repositories/LogRepository");
jest.mock("../config/logger");

describe("LogService - Property-Based Tests", () => {
  let logService: LogService;
  let mockRepository: jest.Mocked<LogRepository>;

  const stringArbitrary = fc.string({ minLength: 1, maxLength: 100 });
  const dataTypeArbitrary = fc.constantFrom("record" as const, "warning" as const, "error" as const);
  const keyArbitrary = fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0);
  const valueArbitrary = fc.string({ minLength: 1, maxLength: 500 });
  const projectIdArbitrary = fc.integer({ min: 1, max: 10000 });

  const logInputArbitrary: fc.Arbitrary<LogInput> = fc.record({
    deviceUuid: stringArbitrary,
    sessionUuid: stringArbitrary,
    projectId: projectIdArbitrary,
    timestamp: fc.integer({ min: 1704067200000, max: 1735603200000 }),
    dataType: dataTypeArbitrary,
    key: keyArbitrary,
    value: valueArbitrary,
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

  describe("Property 1: Round-trip consistency for valid log data", () => {
    it("should preserve log data when creating and retrieving", async () => {
      await fc.assert(
        fc.asyncProperty(logInputArbitrary, async (logInput: LogInput) => {
          const createdAt = new Date();
          const mockCreatedLog = {
            id: Math.floor(Math.random() * 1000000),
            deviceUuid: logInput.deviceUuid,
            sessionUuid: logInput.sessionUuid,
            projectId: logInput.projectId,
            clientIp: null,
            dataType: logInput.dataType,
            logKey: logInput.key,
            logValue: logInput.value,
            clientTimestamp: logInput.timestamp,
            createdAt,
          };

          mockRepository.create.mockResolvedValue(mockCreatedLog as any);
          mockRepository.findById.mockResolvedValue(mockCreatedLog as any);

          const created = await logService.createLog(logInput);
          const retrieved = await logService.getLogById(created.id);

          expect(retrieved).not.toBeNull();
          expect(retrieved!.deviceUuid).toBe(logInput.deviceUuid);
          expect(retrieved!.projectId).toBe(logInput.projectId);
          expect(retrieved!.dataType).toBe(logInput.dataType);
          expect(retrieved!.key).toBe(logInput.key);
          expect(retrieved!.value).toEqual(logInput.value);
        }),
        { numRuns: 100 },
      );
    });

    it("should maintain data integrity across multiple creates and retrieves", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 1, maxLength: 10 }),
          async (logInputs: LogInput[]) => {
            const mockLogs = logInputs.map((input, index) => ({
              id: index + 1,
              deviceUuid: input.deviceUuid,
              sessionUuid: input.sessionUuid,
              projectId: input.projectId,
              clientIp: null,
              dataType: input.dataType,
              logKey: input.key,
              logValue: input.value,
              clientTimestamp: input.timestamp,
              createdAt: new Date(),
            }));

            mockRepository.create.mockImplementation(async (data: any) => {
              const index = logInputs.findIndex(
                (input) => input.deviceUuid === data.deviceUuid && input.key === data.logKey,
              );
              return mockLogs[index] as any;
            });

            mockRepository.findById.mockImplementation(async (id: number) => {
              return mockLogs.find((log) => log.id === id) as any;
            });

            const createdLogs = await Promise.all(logInputs.map((input) => logService.createLog(input)));
            const retrievedLogs = await Promise.all(createdLogs.map((log) => logService.getLogById(log.id)));

            for (let i = 0; i < logInputs.length; i++) {
              expect(retrievedLogs[i]).not.toBeNull();
              expect(retrievedLogs[i]!.deviceUuid).toBe(logInputs[i].deviceUuid);
              expect(retrievedLogs[i]!.projectId).toBe(logInputs[i].projectId);
              expect(retrievedLogs[i]!.dataType).toBe(logInputs[i].dataType);
              expect(retrievedLogs[i]!.key).toBe(logInputs[i].key);
              expect(retrievedLogs[i]!.value).toEqual(logInputs[i].value);
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("Property 2: Automatic timestamp generation", () => {
    it("should generate timestamp within reasonable time range for any log", async () => {
      await fc.assert(
        fc.asyncProperty(logInputArbitrary, async (logInput: LogInput) => {
          const beforeCreate = new Date();

          const mockCreatedLog = {
            id: Math.floor(Math.random() * 1000000),
            deviceUuid: logInput.deviceUuid,
            sessionUuid: logInput.sessionUuid,
            projectId: logInput.projectId,
            clientIp: null,
            dataType: logInput.dataType,
            logKey: logInput.key,
            logValue: logInput.value,
            clientTimestamp: logInput.timestamp,
            createdAt: new Date(),
          };

          mockRepository.create.mockResolvedValue(mockCreatedLog as any);

          const created = await logService.createLog(logInput);
          const afterCreate = new Date();
          const createdTime = new Date(created.createdAt);

          const timeDiff = Math.abs(createdTime.getTime() - beforeCreate.getTime());
          expect(timeDiff).toBeLessThan(5000);
          expect(createdTime.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
          expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        }),
        { numRuns: 100 },
      );
    });

    it("should generate unique timestamps for logs created in sequence", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 2, maxLength: 5 }),
          async (logInputs: LogInput[]) => {
            const timestamps: Date[] = [];

            for (const input of logInputs) {
              const mockCreatedLog = {
                id: Math.floor(Math.random() * 1000000),
                deviceUuid: input.deviceUuid,
                sessionUuid: input.sessionUuid,
                projectId: input.projectId,
                clientIp: null,
                dataType: input.dataType,
                logKey: input.key,
                logValue: input.value,
                clientTimestamp: input.timestamp,
                createdAt: new Date(),
              };

              mockRepository.create.mockResolvedValue(mockCreatedLog as any);

              const created = await logService.createLog(input);
              timestamps.push(new Date(created.createdAt));

              await new Promise((resolve) => setTimeout(resolve, 1));
            }

            for (let i = 1; i < timestamps.length; i++) {
              expect(timestamps[i].getTime()).toBeGreaterThanOrEqual(timestamps[i - 1].getTime());
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("Property 4: Query filter correctness", () => {
    it("should return only logs matching deviceUuid filter", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 5, maxLength: 20 }),
          stringArbitrary,
          async (logInputs: LogInput[], filterUuid: string) => {
            const mockLogs = logInputs.map((input, index) => ({
              id: index + 1,
              deviceUuid: input.deviceUuid,
              projectId: input.projectId,
              dataType: input.dataType,
              logKey: input.key,
              logValue: input.value,
              createdAt: new Date(),
            }));

            const matchingLogs = mockLogs.filter((log) => log.deviceUuid === filterUuid);

            mockRepository.findByFilters.mockResolvedValue(matchingLogs as any);
            mockRepository.countByFilters.mockResolvedValue(matchingLogs.length);

            const result = await logService.queryLogs({ deviceUuid: filterUuid });

            result.data.forEach((log) => {
              expect(log.deviceUuid).toBe(filterUuid);
            });

            expect(result.data.length).toBe(matchingLogs.length);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should return only logs matching dataType filter", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 5, maxLength: 20 }),
          dataTypeArbitrary,
          async (logInputs: LogInput[], filterDataType) => {
            const mockLogs = logInputs.map((input, index) => ({
              id: index + 1,
              deviceUuid: input.deviceUuid,
              projectId: input.projectId,
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
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should return only logs within time range filter", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 5, maxLength: 20 }),
          fc.date({ min: new Date("2024-01-01"), max: new Date("2024-12-31") }),
          fc.date({ min: new Date("2024-01-01"), max: new Date("2024-12-31") }),
          async (logInputs: LogInput[], date1, date2) => {
            const startTime = date1 < date2 ? date1 : date2;
            const endTime = date1 < date2 ? date2 : date1;

            const mockLogs = logInputs.map((input, index) => {
              const randomTime = new Date(
                startTime.getTime() + Math.random() * (endTime.getTime() - startTime.getTime() + 86400000),
              );
              return {
                id: index + 1,
                deviceUuid: input.deviceUuid,
                sessionUuid: input.sessionUuid,
                projectId: input.projectId,
                clientIp: null,
                dataType: input.dataType,
                logKey: input.key,
                logValue: input.value,
                clientTimestamp: input.timestamp,
                createdAt: randomTime,
              };
            });

            const matchingLogs = mockLogs.filter(
              (log) => log.createdAt >= startTime && log.createdAt <= endTime,
            );

            mockRepository.findByFilters.mockResolvedValue(matchingLogs as any);
            mockRepository.countByFilters.mockResolvedValue(matchingLogs.length);

            const result = await logService.queryLogs({ startTime, endTime });

            result.data.forEach((log) => {
              const logTime = new Date(log.createdAt);
              expect(logTime.getTime()).toBeGreaterThanOrEqual(startTime.getTime());
              expect(logTime.getTime()).toBeLessThanOrEqual(endTime.getTime());
            });
          },
        ),
        { numRuns: 50 },
      );
    });

    it("should return logs matching all combined filters", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 10, maxLength: 30 }),
          stringArbitrary,
          dataTypeArbitrary,
          async (logInputs: LogInput[], filterUuid, filterDataType) => {
            const mockLogs = logInputs.map((input, index) => ({
              id: index + 1,
              deviceUuid: input.deviceUuid,
              sessionUuid: input.sessionUuid,
              projectId: input.projectId,
              clientIp: null,
              dataType: input.dataType,
              logKey: input.key,
              logValue: input.value,
              clientTimestamp: input.timestamp,
              createdAt: new Date(),
            }));

            const matchingLogs = mockLogs.filter(
              (log) => log.deviceUuid === filterUuid && log.dataType === filterDataType,
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
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("Property 5: Pagination consistency", () => {
    it("should not exceed specified page size", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 50 }),
          async (logInputs: LogInput[], pageSize: number) => {
            const mockLogs = logInputs.map((input, index) => ({
              id: index + 1,
              deviceUuid: input.deviceUuid,
              sessionUuid: input.sessionUuid,
              projectId: input.projectId,
              clientIp: null,
              dataType: input.dataType,
              logKey: input.key,
              logValue: input.value,
              clientTimestamp: input.timestamp,
              createdAt: new Date(),
            }));

            const pagedLogs = mockLogs.slice(0, pageSize);

            mockRepository.findByFilters.mockResolvedValue(pagedLogs as any);
            mockRepository.countByFilters.mockResolvedValue(mockLogs.length);

            const result = await logService.queryLogs({}, { page: 1, pageSize });

            expect(result.data.length).toBeLessThanOrEqual(pageSize);
            expect(result.pagination.pageSize).toBe(pageSize);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should return correct total count regardless of page", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 10, maxLength: 100 }),
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 20 }),
          async (logInputs: LogInput[], page: number, pageSize: number) => {
            const mockLogs = logInputs.map((input, index) => ({
              id: index + 1,
              deviceUuid: input.deviceUuid,
              sessionUuid: input.sessionUuid,
              projectId: input.projectId,
              clientIp: null,
              dataType: input.dataType,
              logKey: input.key,
              logValue: input.value,
              clientTimestamp: input.timestamp,
              createdAt: new Date(),
            }));

            const offset = (page - 1) * pageSize;
            const pagedLogs = mockLogs.slice(offset, offset + pageSize);

            mockRepository.findByFilters.mockResolvedValue(pagedLogs as any);
            mockRepository.countByFilters.mockResolvedValue(mockLogs.length);

            const result = await logService.queryLogs({}, { page, pageSize });

            expect(result.pagination.total).toBe(mockLogs.length);
            expect(result.pagination.page).toBe(page);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should calculate total pages correctly", async () => {
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
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should traverse all logs when iterating through pages", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(logInputArbitrary, { minLength: 10, maxLength: 50 }),
          fc.integer({ min: 5, max: 15 }),
          async (logInputs: LogInput[], pageSize: number) => {
            const mockLogs = logInputs.map((input, index) => ({
              id: index + 1,
              deviceUuid: input.deviceUuid,
              sessionUuid: input.sessionUuid,
              projectId: input.projectId,
              clientIp: null,
              dataType: input.dataType,
              logKey: input.key,
              logValue: input.value,
              clientTimestamp: input.timestamp,
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

            expect(allRetrievedIds.size).toBe(mockLogs.length);
            mockLogs.forEach((log) => {
              expect(allRetrievedIds.has(log.id)).toBe(true);
            });
          },
        ),
        { numRuns: 50 },
      );
    });

    it("should return empty data for page beyond total pages", async () => {
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
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
