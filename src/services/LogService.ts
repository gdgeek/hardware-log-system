/**
 * LogService - Business Logic Layer for Log operations
 */

import {
  LogInput,
  LogOutput,
  LogFilters,
  Pagination,
  PaginatedResult,
} from "../types";
import { logRepository, LogRepository } from "../repositories/LogRepository";
import { Log } from "../models/Log";
import { validateOrThrow } from "../validation/validator";
import {
  logInputSchema,
  logFiltersSchema,
  paginationSchema,
} from "../validation/schemas";
import { logger } from "../config/logger";

export class LogService {
  constructor(private repository: LogRepository = logRepository) {}

  /**
   * Creates a new log entry
   */
  async createLog(logData: LogInput): Promise<LogOutput> {
    const validatedData = validateOrThrow<LogInput>(logInputSchema, logData);

    logger.info("Creating log entry", {
      deviceUuid: validatedData.deviceUuid,
      dataType: validatedData.dataType,
      key: validatedData.key,
    });

    const log = await this.repository.create({
      deviceUuid: validatedData.deviceUuid,
      sessionUuid: validatedData.sessionUuid,
      clientIp: validatedData.clientIp || null,
      dataType: validatedData.dataType,
      logKey: validatedData.key,
      logValue: validatedData.value,
      clientTimestamp: validatedData.timestamp,
    });

    logger.info("Log entry created successfully", { id: log.id });

    return this.toLogOutput(log);
  }

  /**
   * Retrieves a log entry by ID
   */
  async getLogById(id: number): Promise<LogOutput | null> {
    logger.debug("Retrieving log by ID", { id });

    const log = await this.repository.findById(id);

    if (!log) {
      logger.debug("Log not found", { id });
      return null;
    }

    return this.toLogOutput(log);
  }

  /**
   * Queries logs with filters and pagination
   */
  async queryLogs(
    filters: LogFilters = {},
    pagination: Pagination = { page: 1, pageSize: 20 },
  ): Promise<PaginatedResult<LogOutput>> {
    const validatedFilters = validateOrThrow<LogFilters>(
      logFiltersSchema,
      filters,
    );
    const validatedPagination = validateOrThrow<Pagination>(
      paginationSchema,
      pagination,
    );

    logger.info("Querying logs", {
      filters: validatedFilters,
      pagination: validatedPagination,
    });

    const [logs, total] = await Promise.all([
      this.repository.findByFilters(validatedFilters, validatedPagination),
      this.repository.countByFilters(validatedFilters),
    ]);

    const totalPages = Math.ceil(total / validatedPagination.pageSize);

    logger.info("Query completed", {
      resultCount: logs.length,
      total,
      totalPages,
    });

    return {
      data: logs.map((log) => this.toLogOutput(log)),
      pagination: {
        page: validatedPagination.page,
        pageSize: validatedPagination.pageSize,
        total,
        totalPages,
      },
    };
  }

  /**
   * Converts a Log model instance to LogOutput format
   */
  private toLogOutput(log: Log): LogOutput {
    return {
      id: Number(log.id),
      deviceUuid: log.deviceUuid,
      sessionUuid: log.sessionUuid,
      clientIp: log.clientIp,
      dataType: log.dataType,
      key: log.logKey,
      value: log.logValue,
      clientTimestamp: log.clientTimestamp ? Number(log.clientTimestamp) : null,
      createdAt: log.createdAt.toISOString(),
    };
  }

  /**
   * Deletes a log entry by ID
   */
  async deleteLog(id: number): Promise<boolean> {
    logger.info("Deleting log entry", { id });
    const deleted = await this.repository.deleteById(id);
    if (deleted) {
      logger.info("Log entry deleted successfully", { id });
    } else {
      logger.warn("Log entry not found for deletion", { id });
    }
    return deleted;
  }

  /**
   * Deletes multiple logs by filter criteria
   */
  async deleteLogs(filters: LogFilters): Promise<number> {
    const validatedFilters = validateOrThrow<LogFilters>(
      logFiltersSchema,
      filters,
    );
    logger.info("Deleting logs by filters", { filters: validatedFilters });
    const deleted = await this.repository.deleteByFilters(validatedFilters);
    logger.info("Logs deleted", { count: deleted });
    return deleted;
  }
}

export const logService = new LogService();
