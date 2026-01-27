import { LogRepository } from "./LogRepository";
import { Log } from "../models/Log";
import { DataType, LogFilters, Pagination, DatabaseError } from "../types";

jest.mock("../models/Log");
jest.mock("../config/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("LogRepository", () => {
  let repository: LogRepository;
  let mockLog: jest.Mocked<typeof Log>;

  beforeEach(() => {
    repository = new LogRepository();
    mockLog = Log as jest.Mocked<typeof Log>;
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a log entry successfully", async () => {
      const logData = {
        deviceUuid: "test-device-uuid-1",
        projectId: 1001,
        dataType: "record" as DataType,
        logKey: "test-key",
        logValue: "test message",
        sessionUuid: "test-session-uuid",
      };

      const mockCreatedLog = {
        id: 1,
        ...logData,
        createdAt: new Date(),
        toJSON: jest.fn().mockReturnThis(),
      };

      mockLog.create = jest.fn().mockResolvedValue(mockCreatedLog);

      const log = await repository.create(logData);

      expect(log).toBeDefined();
      expect(log.id).toBe(1);
      expect(log.deviceUuid).toBe(logData.deviceUuid);
      expect(log.projectId).toBe(logData.projectId);
      expect(log.dataType).toBe(logData.dataType);
      expect(log.logKey).toBe(logData.logKey);
      expect(log.logValue).toEqual(logData.logValue);
      expect(mockLog.create).toHaveBeenCalledWith(logData);
    });

    it("should throw DatabaseError when creation fails", async () => {
      const invalidData = {
        deviceUuid: "",
        projectId: 1001,
        dataType: "record" as DataType,
        logKey: "test-key",
        logValue: "test data",
        sessionUuid: "test-session-uuid",
      };

      mockLog.create = jest.fn().mockRejectedValue(new Error("Validation error"));

      await expect(repository.create(invalidData)).rejects.toThrow(DatabaseError);
    });
  });

  describe("findById", () => {
    it("should find a log by ID", async () => {
      const mockFoundLog = {
        id: 1,
        deviceUuid: "test-device-uuid-3",
        projectId: 1001,
        dataType: "error" as DataType,
        logKey: "test-key",
        logValue: "test error",
        sessionUuid: "test-session-uuid",
        createdAt: new Date(),
        toJSON: jest.fn().mockReturnThis(),
      };

      mockLog.findByPk = jest.fn().mockResolvedValue(mockFoundLog);

      const found = await repository.findById(1);

      expect(found).toBeDefined();
      expect(found?.id).toBe(1);
      expect(mockLog.findByPk).toHaveBeenCalledWith(1);
    });

    it("should return null when log ID does not exist", async () => {
      mockLog.findByPk = jest.fn().mockResolvedValue(null);

      const found = await repository.findById(99999);

      expect(found).toBeNull();
    });
  });

  describe("findByFilters", () => {
    it("should find logs by device UUID", async () => {
      const mockLogs = [
        {
          id: 1,
          deviceUuid: "device-1",
          projectId: 1001,
          dataType: "record" as DataType,
          logKey: "key-1",
          logValue: "test1",
          sessionUuid: "session-1",
          createdAt: new Date(),
          toJSON: jest.fn().mockReturnThis(),
        },
        {
          id: 2,
          deviceUuid: "device-1",
          projectId: 1001,
          dataType: "warning" as DataType,
          logKey: "key-2",
          logValue: "test2",
          sessionUuid: "session-1",
          createdAt: new Date(),
          toJSON: jest.fn().mockReturnThis(),
        },
      ];

      mockLog.findAll = jest.fn().mockResolvedValue(mockLogs);

      const filters: LogFilters = { deviceUuid: "device-1" };
      const pagination: Pagination = { page: 1, pageSize: 10 };

      const logs = await repository.findByFilters(filters, pagination);

      expect(logs).toHaveLength(2);
      expect(mockLog.findAll).toHaveBeenCalled();
    });

    it("should return empty array when no logs match filters", async () => {
      mockLog.findAll = jest.fn().mockResolvedValue([]);

      const filters: LogFilters = { deviceUuid: "non-existent-device" };
      const pagination: Pagination = { page: 1, pageSize: 10 };

      const logs = await repository.findByFilters(filters, pagination);

      expect(logs).toHaveLength(0);
    });
  });

  describe("countByFilters", () => {
    it("should count logs by device UUID", async () => {
      mockLog.count = jest.fn().mockResolvedValue(2);

      const filters: LogFilters = { deviceUuid: "device-1" };

      const count = await repository.countByFilters(filters);

      expect(count).toBe(2);
      expect(mockLog.count).toHaveBeenCalled();
    });

    it("should return 0 when no logs match filters", async () => {
      mockLog.count = jest.fn().mockResolvedValue(0);

      const filters: LogFilters = { deviceUuid: "non-existent-device" };

      const count = await repository.countByFilters(filters);

      expect(count).toBe(0);
    });
  });

  describe("aggregateByDevice", () => {
    it("should aggregate logs by device", async () => {
      const mockAggregateResult = [
        { dataType: "record", count: "2", firstLogTime: new Date("2024-01-01"), lastLogTime: new Date("2024-01-15") },
        { dataType: "warning", count: "1", firstLogTime: new Date("2024-01-10"), lastLogTime: new Date("2024-01-20") },
        { dataType: "error", count: "1", firstLogTime: new Date("2024-01-05"), lastLogTime: new Date("2024-01-31") },
      ];

      mockLog.findAll = jest.fn().mockResolvedValue(mockAggregateResult);

      const report = await repository.aggregateByDevice("device-1");

      expect(report.deviceUuid).toBe("device-1");
      expect(report.totalLogs).toBe(4);
      expect(report.recordCount).toBe(2);
      expect(report.warningCount).toBe(1);
      expect(report.errorCount).toBe(1);
    });

    it("should return empty report for device with no logs", async () => {
      mockLog.findAll = jest.fn().mockResolvedValue([]);

      const report = await repository.aggregateByDevice("non-existent-device");

      expect(report.deviceUuid).toBe("non-existent-device");
      expect(report.totalLogs).toBe(0);
    });
  });

  describe("aggregateByTimeRange", () => {
    it("should aggregate logs by time range", async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60);

      const mockAggregateResult = [
        { dataType: "record", count: 1 },
        { dataType: "warning", count: 1 },
        { dataType: "error", count: 1 },
      ];

      const mockDeviceCount = [{ deviceCount: 2 }];

      mockLog.findAll = jest.fn()
        .mockResolvedValueOnce(mockAggregateResult)
        .mockResolvedValueOnce(mockDeviceCount);

      const report = await repository.aggregateByTimeRange(past, now);

      expect(report.startTime).toBe(past.toISOString());
      expect(report.endTime).toBe(now.toISOString());
      expect(report.totalLogs).toBe(3);
      expect(report.deviceCount).toBe(2);
    });
  });

  describe("aggregateErrors", () => {
    it("should aggregate error logs", async () => {
      const mockErrors = [
        { deviceUuid: "device-1", logKey: "error-key-1", count: 2, lastOccurrence: new Date() },
        { deviceUuid: "device-2", logKey: "error-key-2", count: 1, lastOccurrence: new Date() },
      ];

      mockLog.findAll = jest.fn().mockResolvedValue(mockErrors);

      const report = await repository.aggregateErrors();

      expect(report.totalErrors).toBe(3);
      expect(report.errors).toHaveLength(2);
    });

    it("should return empty report when no error logs exist", async () => {
      mockLog.findAll = jest.fn().mockResolvedValue([]);

      const report = await repository.aggregateErrors();

      expect(report.totalErrors).toBe(0);
      expect(report.errors).toHaveLength(0);
    });
  });

  describe("deleteById", () => {
    it("should delete a log by ID", async () => {
      mockLog.destroy = jest.fn().mockResolvedValue(1);

      const result = await repository.deleteById(1);

      expect(result).toBe(true);
      expect(mockLog.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("should return false when log not found", async () => {
      mockLog.destroy = jest.fn().mockResolvedValue(0);

      const result = await repository.deleteById(999);

      expect(result).toBe(false);
    });

    it("should throw DatabaseError when deletion fails", async () => {
      mockLog.destroy = jest.fn().mockRejectedValue(new Error("Database error"));

      await expect(repository.deleteById(1)).rejects.toThrow(DatabaseError);
    });
  });
});
