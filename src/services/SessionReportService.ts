/**
 * SessionReportService - 会话报表相关业务逻辑
 * 
 * 从 SessionService 中拆分出来，负责：
 * - 项目整理报表（单日/多日）
 * - 列名映射
 * - 原始日志导出
 */

import { logRepository } from "../repositories/LogRepository";
import { projectService } from "./ProjectService";
import { Log } from "../models/Log";
import { ProjectOrganizationReport } from "../types/index";

/**
 * 对报表数据应用列名映射
 */
function applyColumnMappingToReport(
  keys: string[],
  matrix: Record<string, Record<string, string | null>>,
  columnMapping: Record<string, string>,
): { keys: string[]; matrix: Record<string, Record<string, string | null>> } {
  const mappedKeys = keys.map((key) => columnMapping[key] || key);

  const mappedMatrix: Record<string, Record<string, string | null>> = {};
  for (const [sessionUuid, sessionData] of Object.entries(matrix)) {
    mappedMatrix[sessionUuid] = {};
    for (const [originalKey, value] of Object.entries(sessionData)) {
      const mappedKey = columnMapping[originalKey] || originalKey;
      mappedMatrix[sessionUuid][mappedKey] = value;
    }
  }

  return { keys: mappedKeys, matrix: mappedMatrix };
}

class SessionReportService {
  /**
   * 获取项目整理报表（按天分组）
   */
  async getProjectOrganizationReportByDays(
    projectId: number,
    startDate: string,
    endDate?: string,
  ): Promise<{
    dailyReports: Array<ProjectOrganizationReport & { date: string }>;
    combinedReport: ProjectOrganizationReport;
  }> {
    const finalEndDate = endDate || startDate;

    const result = await logRepository.aggregateProjectOrganizationByDays(
      projectId,
      startDate,
      finalEndDate,
    );

    try {
      const project = await projectService.getProjectById(projectId);
      if (project && project.columnMapping) {
        const mappedDailyReports = result.dailyReports.map((report) => {
          const mapped = applyColumnMappingToReport(
            report.keys,
            report.matrix,
            project.columnMapping,
          );
          return { ...report, ...mapped };
        });

        const mappedCombined = applyColumnMappingToReport(
          result.combinedReport.keys,
          result.combinedReport.matrix,
          project.columnMapping,
        );

        return {
          dailyReports: mappedDailyReports,
          combinedReport: { ...result.combinedReport, ...mappedCombined },
        };
      }
    } catch {
      // 如果映射失败，返回原始报表
    }

    return result;
  }

  /**
   * 获取项目整理报表
   */
  async getProjectOrganizationReport(
    projectId: number,
    startDate: string,
    endDate?: string,
  ): Promise<ProjectOrganizationReport> {
    const finalEndDate = endDate || startDate;

    const report = await logRepository.aggregateProjectOrganization(
      projectId,
      startDate,
      finalEndDate,
    );

    try {
      const project = await projectService.getProjectById(projectId);
      if (project && project.columnMapping) {
        const mapped = applyColumnMappingToReport(
          report.keys,
          report.matrix,
          project.columnMapping,
        );
        return { ...report, ...mapped };
      }
    } catch {
      // 如果映射失败，返回原始报表
    }

    return report;
  }

  /**
   * 获取项目的原始日志数据（用于导出）
   */
  async getProjectRawLogs(
    projectId: number,
    startDate: string,
    endDate: string,
  ): Promise<{
    projectId: number;
    startDate: string;
    endDate: string;
    totalLogs: number;
    logs: Log[];
  }> {
    const startDateTime = new Date(startDate + "T00:00:00.000Z");
    const endDateTime = new Date(endDate + "T23:59:59.999Z");

    const logs = await logRepository.findByFilters(
      {
        projectId,
        startTime: startDateTime,
        endTime: endDateTime,
      },
      { page: 1, pageSize: 50000 },
    );

    logs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return {
      projectId,
      startDate,
      endDate,
      totalLogs: logs.length,
      logs,
    };
  }
}

export const sessionReportService = new SessionReportService();
export { applyColumnMappingToReport };
