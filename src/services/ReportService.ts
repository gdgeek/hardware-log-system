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

import { DeviceReport, TimeRangeReport, ErrorReport } from '../types';
import { logRepository, LogRepository } from '../repositories/LogRepository';
import { validateOrThrow } from '../validation/validator';
import { deviceUuidParamSchema, timeRangeQuerySchema } from '../validation/schemas';
import { logger } from '../config/logger';

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

    logger.info('Generating device report', { uuid: validated.uuid });

    const report = await this.repository.aggregateByDevice(validated.uuid);

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

    logger.info('Generating time range report', {
      startTime: validated.startTime,
      endTime: validated.endTime,
    });

    const report = await this.repository.aggregateByTimeRange(
      validated.startTime,
      validated.endTime
    );

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
    logger.info('Generating error report');

    const report = await this.repository.aggregateErrors();

    logger.info('Error report generated', {
      totalErrors: report.totalErrors,
      errorCount: report.errors.length,
    });

    return report;
  }
}

// Export singleton instance
export const reportService = new ReportService();
