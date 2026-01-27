import { Op, fn, col, literal } from "sequelize";
import { Log, LogCreationAttributes } from "../models/Log";
import {
  LogFilters,
  Pagination,
  DeviceReport,
  TimeRangeReport,
  ErrorReport,
  DatabaseError,
} from "../types";
import { logger } from "../config/logger";

/**
 * LogRepository - Data Access Layer for Log operations
 * Encapsulates all database operations for the Log model
 */
export class LogRepository {
  /**
   * Creates a new log entry in the database
   * @param logData - The log data to insert
   * @returns Promise resolving to the created Log instance
   * @throws DatabaseError if the operation fails
   */
  async create(logData: LogCreationAttributes): Promise<Log> {
    try {
      const log = await Log.create(logData);
      logger.debug("Log created successfully", {
        id: log.id,
        deviceUuid: log.deviceUuid,
      });
      return log;
    } catch (error) {
      logger.error("Failed to create log", {
        error: error instanceof Error ? error.message : "Unknown error",
        logData,
      });
      throw new DatabaseError(
        "Failed to create log entry",
        "DATABASE_ERROR",
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Finds a log entry by its ID
   * @param id - The log ID to search for
   * @returns Promise resolving to the Log instance or null if not found
   * @throws DatabaseError if the operation fails
   */
  async findById(id: number): Promise<Log | null> {
    try {
      const log = await Log.findByPk(id);
      logger.debug("Log query by ID", { id, found: !!log });
      return log;
    } catch (error) {
      logger.error("Failed to find log by ID", {
        error: error instanceof Error ? error.message : "Unknown error",
        id,
      });
      throw new DatabaseError(
        "Failed to query log by ID",
        "DATABASE_ERROR",
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Finds logs matching the specified filters with pagination
   * @param filters - Filter criteria for the query
   * @param pagination - Pagination parameters
   * @returns Promise resolving to an array of Log instances
   * @throws DatabaseError if the operation fails
   */
  async findByFilters(
    filters: LogFilters,
    pagination: Pagination,
  ): Promise<Log[]> {
    try {
      const whereClause = this.buildWhereClause(filters);
      const { page, pageSize } = pagination;
      const offset = (page - 1) * pageSize;

      const logs = await Log.findAll({
        where: whereClause,
        limit: pageSize,
        offset: offset,
        order: [["createdAt", "DESC"]], // Most recent first
      });

      logger.debug("Logs queried by filters", {
        filters,
        pagination,
        resultCount: logs.length,
      });

      return logs;
    } catch (error) {
      logger.error("Failed to query logs by filters", {
        error: error instanceof Error ? error.message : "Unknown error",
        filters,
        pagination,
      });
      throw new DatabaseError(
        "Failed to query logs",
        "DATABASE_ERROR",
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Counts the number of logs matching the specified filters
   * @param filters - Filter criteria for the count
   * @returns Promise resolving to the count of matching logs
   * @throws DatabaseError if the operation fails
   */
  async countByFilters(filters: LogFilters): Promise<number> {
    try {
      const whereClause = this.buildWhereClause(filters);
      const count = await Log.count({ where: whereClause });

      logger.debug("Logs counted by filters", { filters, count });

      return count;
    } catch (error) {
      logger.error("Failed to count logs by filters", {
        error: error instanceof Error ? error.message : "Unknown error",
        filters,
      });
      throw new DatabaseError(
        "Failed to count logs",
        "DATABASE_ERROR",
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Aggregates log statistics for a specific device
   * @param uuid - The device UUID to aggregate for
   * @returns Promise resolving to device statistics
   * @throws DatabaseError if the operation fails
   */
  async aggregateByDevice(uuid: string): Promise<DeviceReport> {
    try {
      // Get total counts by data type
      const stats = (await Log.findAll({
        where: { deviceUuid: uuid },
        attributes: [
          "dataType",
          [fn("COUNT", col("id")), "count"],
          [fn("MIN", col("createdAt")), "firstLogTime"],
          [fn("MAX", col("createdAt")), "lastLogTime"],
        ],
        group: ["dataType"],
        raw: true,
      })) as unknown as Array<{
        dataType: string;
        count: string;
        firstLogTime: Date;
        lastLogTime: Date;
      }>;

      // If no logs found, return empty report
      if (stats.length === 0) {
        return {
          deviceUuid: uuid,
          totalLogs: 0,
          recordCount: 0,
          warningCount: 0,
          errorCount: 0,
          firstLogTime: "",
          lastLogTime: "",
        };
      }

      // Calculate totals and find min/max times
      let totalLogs = 0;
      let recordCount = 0;
      let warningCount = 0;
      let errorCount = 0;
      let firstLogTime: Date | null = null;
      let lastLogTime: Date | null = null;

      for (const stat of stats) {
        const count = parseInt(stat.count, 10);
        totalLogs += count;

        switch (stat.dataType) {
          case "record":
            recordCount = count;
            break;
          case "warning":
            warningCount = count;
            break;
          case "error":
            errorCount = count;
            break;
        }

        // Track earliest and latest times across all types
        if (!firstLogTime || new Date(stat.firstLogTime) < firstLogTime) {
          firstLogTime = new Date(stat.firstLogTime);
        }
        if (!lastLogTime || new Date(stat.lastLogTime) > lastLogTime) {
          lastLogTime = new Date(stat.lastLogTime);
        }
      }

      const report: DeviceReport = {
        deviceUuid: uuid,
        totalLogs,
        recordCount,
        warningCount,
        errorCount,
        firstLogTime: firstLogTime ? firstLogTime.toISOString() : "",
        lastLogTime: lastLogTime ? lastLogTime.toISOString() : "",
      };

      logger.debug("Device aggregation completed", { uuid, report });

      return report;
    } catch (error) {
      logger.error("Failed to aggregate logs by device", {
        error: error instanceof Error ? error.message : "Unknown error",
        uuid,
      });
      throw new DatabaseError(
        "Failed to aggregate device statistics",
        "DATABASE_ERROR",
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Aggregates log statistics for a specific time range
   * @param start - Start of the time range
   * @param end - End of the time range
   * @returns Promise resolving to time range statistics
   * @throws DatabaseError if the operation fails
   */
  async aggregateByTimeRange(start: Date, end: Date): Promise<TimeRangeReport> {
    try {
      // Get counts by data type
      const stats = (await Log.findAll({
        where: {
          createdAt: {
            [Op.gte]: start,
            [Op.lte]: end,
          },
        },
        attributes: ["dataType", [fn("COUNT", col("id")), "count"]],
        group: ["dataType"],
        raw: true,
      })) as unknown as Array<{ dataType: string; count: string }>;

      // Get unique device count
      const deviceCountResult = (await Log.findAll({
        where: {
          createdAt: {
            [Op.gte]: start,
            [Op.lte]: end,
          },
        },
        attributes: [
          [fn("COUNT", fn("DISTINCT", col("deviceUuid"))), "deviceCount"],
        ],
        raw: true,
      })) as unknown as Array<{ deviceCount: string }>;

      const deviceCount =
        deviceCountResult.length > 0
          ? parseInt(deviceCountResult[0].deviceCount, 10)
          : 0;

      // Calculate totals by type
      let totalLogs = 0;
      let recordCount = 0;
      let warningCount = 0;
      let errorCount = 0;

      for (const stat of stats) {
        const count = parseInt(stat.count, 10);
        totalLogs += count;

        switch (stat.dataType) {
          case "record":
            recordCount = count;
            break;
          case "warning":
            warningCount = count;
            break;
          case "error":
            errorCount = count;
            break;
        }
      }

      const report: TimeRangeReport = {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        totalLogs,
        recordCount,
        warningCount,
        errorCount,
        deviceCount,
      };

      logger.debug("Time range aggregation completed", { start, end, report });

      return report;
    } catch (error) {
      logger.error("Failed to aggregate logs by time range", {
        error: error instanceof Error ? error.message : "Unknown error",
        start,
        end,
      });
      throw new DatabaseError(
        "Failed to aggregate time range statistics",
        "DATABASE_ERROR",
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Aggregates error log statistics
   * @returns Promise resolving to error statistics
   * @throws DatabaseError if the operation fails
   */
  async aggregateErrors(): Promise<ErrorReport> {
    try {
      // Get error logs grouped by device and key
      const errorStats = (await Log.findAll({
        where: { dataType: "error" },
        attributes: [
          "deviceUuid",
          "logKey",
          [fn("COUNT", col("id")), "count"],
          [fn("MAX", col("createdAt")), "lastOccurrence"],
        ],
        group: ["deviceUuid", "logKey"],
        order: [[literal("count"), "DESC"]], // Most frequent errors first
        raw: true,
      })) as unknown as Array<{
        deviceUuid: string;
        logKey: string;
        count: string;
        lastOccurrence: Date;
      }>;

      const errors = errorStats.map((stat) => ({
        deviceUuid: stat.deviceUuid,
        key: stat.logKey,
        count: parseInt(stat.count, 10),
        lastOccurrence: new Date(stat.lastOccurrence).toISOString(),
      }));

      const totalErrors = errors.reduce((sum, error) => sum + error.count, 0);

      const report: ErrorReport = {
        errors,
        totalErrors,
      };

      logger.debug("Error aggregation completed", {
        totalErrors,
        errorCount: errors.length,
      });

      return report;
    } catch (error) {
      logger.error("Failed to aggregate error logs", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new DatabaseError(
        "Failed to aggregate error statistics",
        "DATABASE_ERROR",
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Builds a Sequelize where clause from filter criteria
   * @param filters - Filter criteria
   * @returns Sequelize where clause object
   * @private
   */
  private buildWhereClause(filters: LogFilters): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (filters.deviceUuid) {
      where.deviceUuid = filters.deviceUuid;
    }

    if (filters.sessionUuid) {
      where.sessionUuid = filters.sessionUuid;
    }

    if (filters.projectId !== undefined) {
      where.projectId = filters.projectId;
    }

    if (filters.dataType) {
      where.dataType = filters.dataType;
    }

    if (filters.startTime || filters.endTime) {
      const createdAt: Record<symbol, Date> = {};

      if (filters.startTime) {
        createdAt[Op.gte] = filters.startTime;
      }

      if (filters.endTime) {
        createdAt[Op.lte] = filters.endTime;
      }

      where.createdAt = createdAt;
    }

    return where;
  }

  /**
   * Deletes a log entry by ID
   * @param id - The log ID to delete
   * @returns Promise resolving to true if deleted, false if not found
   * @throws DatabaseError if the operation fails
   */
  async deleteById(id: number): Promise<boolean> {
    try {
      const deleted = await Log.destroy({ where: { id } });
      logger.debug("Log delete by ID", { id, deleted: deleted > 0 });
      return deleted > 0;
    } catch (error) {
      logger.error("Failed to delete log by ID", {
        error: error instanceof Error ? error.message : "Unknown error",
        id,
      });
      throw new DatabaseError(
        "Failed to delete log",
        "DATABASE_ERROR",
        error instanceof Error ? error : undefined,
      );
    }
  }
}

// Export a singleton instance
export const logRepository = new LogRepository();
