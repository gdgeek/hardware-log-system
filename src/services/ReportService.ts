/**
 * ReportService - Business Logic Layer for Report generation
 * 
 * Handles:
 * - Device statistics report generation
 * - Time range statistics report generation
 * - Error statistics report generation
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { DeviceReport, TimeRangeReport, ErrorReport, ProjectOrganizationReport } from '../types';
import { logRepository, LogRepository } from '../repositories/LogRepository';
import { validateOrThrow } from '../validation/validator';
import { deviceUuidParamSchema, timeRangeQuerySchema, projectOrganizationQuerySchema } from '../validation/schemas';
import { logger } from '../config/logger';
import { cacheService } from '../config/redis';

// 缓存 TTL（秒）
const CACHE_TTL = {
  DEVICE_REPORT: 60,      // 设备报表缓存 1 分钟
  TIME_RANGE_REPORT: 120, // 时间段报表缓存 2 分钟
  ERROR_REPORT: 60,       // 错误报表缓存 1 分钟
  PROJECT_ORGANIZATION: 300, // 项目整理报表缓存 5 分钟
};

export class ReportService {
  constructor(private repository: LogRepository = logRepository) {}

  /**
   * Generates a device statistics report
   * 
   * @param uuid - Device UUID
   * @returns Promise resolving to device report
   * @throws ValidationError if UUID is invalid
   * @throws DatabaseError if database operation fails
   * 
   * Requirements: 3.1
   */
  async generateDeviceReport(uuid: string): Promise<DeviceReport> {
    // Validate UUID format
    const validated = validateOrThrow<{ uuid: string }>(deviceUuidParamSchema, { uuid });

    // 尝试从缓存获取
    const cacheKey = `report:device:${validated.uuid}`;
    const cached = await cacheService.get<DeviceReport>(cacheKey);
    if (cached) {
      logger.debug('Device report from cache', { uuid: validated.uuid });
      return cached;
    }

    logger.info('Generating device report', { uuid: validated.uuid });

    const report = await this.repository.aggregateByDevice(validated.uuid);

    // 存入缓存
    await cacheService.set(cacheKey, report, CACHE_TTL.DEVICE_REPORT);

    logger.info('Device report generated', {
      uuid: validated.uuid,
      totalLogs: report.totalLogs,
    });

    return report;
  }

  /**
   * Generates a time range statistics report
   * 
   * @param startTime - Start of time range
   * @param endTime - End of time range
   * @returns Promise resolving to time range report
   * @throws ValidationError if time range is invalid
   * @throws DatabaseError if database operation fails
   * 
   * Requirements: 3.2
   */
  async generateTimeRangeReport(startTime: Date, endTime: Date): Promise<TimeRangeReport> {
    // Validate time range
    const validated = validateOrThrow<{ startTime: Date; endTime: Date }>(
      timeRangeQuerySchema,
      { startTime, endTime }
    );

    // 尝试从缓存获取
    const cacheKey = `report:timerange:${validated.startTime.getTime()}:${validated.endTime.getTime()}`;
    const cached = await cacheService.get<TimeRangeReport>(cacheKey);
    if (cached) {
      logger.debug('Time range report from cache', { startTime, endTime });
      return cached;
    }

    logger.info('Generating time range report', {
      startTime: validated.startTime,
      endTime: validated.endTime,
    });

    const report = await this.repository.aggregateByTimeRange(
      validated.startTime,
      validated.endTime
    );

    // 存入缓存
    await cacheService.set(cacheKey, report, CACHE_TTL.TIME_RANGE_REPORT);

    logger.info('Time range report generated', {
      totalLogs: report.totalLogs,
      deviceCount: report.deviceCount,
    });

    return report;
  }

  /**
   * Generates an error statistics report
   * 
   * @returns Promise resolving to error report
   * @throws DatabaseError if database operation fails
   * 
   * Requirements: 3.3
   */
  async generateErrorReport(): Promise<ErrorReport> {
    // 尝试从缓存获取
    const cacheKey = 'report:errors';
    const cached = await cacheService.get<ErrorReport>(cacheKey);
    if (cached) {
      logger.debug('Error report from cache');
      return cached;
    }

    logger.info('Generating error report');

    const report = await this.repository.aggregateErrors();

    // 存入缓存
    await cacheService.set(cacheKey, report, CACHE_TTL.ERROR_REPORT);

    logger.info('Error report generated', {
      totalErrors: report.totalErrors,
      errorCount: report.errors.length,
    });

    return report;
  }

  /**
   * Generates a project organization report
   * Creates a matrix with devices as rows and keys as columns
   * 
   * @param projectId - Project ID
   * @param date - Date in YYYY-MM-DD format
   * @returns Promise resolving to project organization report
   * @throws ValidationError if parameters are invalid
   * @throws DatabaseError if database operation fails
   */
  async generateProjectOrganizationReport(projectId: number, date: string): Promise<ProjectOrganizationReport> {
    // Validate parameters
    const validated = validateOrThrow<{ projectId: number; date: string }>(
      projectOrganizationQuerySchema,
      { projectId, date }
    );

    // 尝试从缓存获取
    const cacheKey = `report:project-org:${validated.projectId}:${validated.date}`;
    const cached = await cacheService.get<ProjectOrganizationReport>(cacheKey);
    if (cached) {
      logger.debug('Project organization report from cache', { projectId, date });
      return cached;
    }

    logger.info('Generating project organization report', {
      projectId: validated.projectId,
      date: validated.date,
    });

    const report = await this.repository.aggregateProjectOrganization(
      validated.projectId,
      validated.date
    );

    // 存入缓存
    await cacheService.set(cacheKey, report, CACHE_TTL.PROJECT_ORGANIZATION);

    logger.info('Project organization report generated', {
      projectId: validated.projectId,
      date: validated.date,
      totalDevices: report.totalDevices,
      totalKeys: report.totalKeys,
      totalEntries: report.totalEntries,
    });

    return report;
  }
}

// Export singleton instance
export const reportService = new ReportService();
