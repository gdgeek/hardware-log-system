/**
 * SessionService - 会话浏览相关业务逻辑
 *
 * 负责：
 * - 项目列表（按会话聚合）
 * - 会话列表
 * - 会话详情
 *
 * 报表相关逻辑已拆分到 SessionReportService
 */

import { logRepository } from "../repositories/LogRepository";
import { Log } from "../models/Log";
import { sessionReportService } from "./SessionReportService";
import { ProjectOrganizationReport } from "../types/index";

export interface SessionSummary {
  sessionUuid: string;
  projectId: number;
  deviceUuid: string | null;
  logCount: number;
  recordCount: number;
  warningCount: number;
  errorCount: number;
  firstLogTime: Date;
  lastLogTime: Date;
}

export interface SessionDetail {
  sessionUuid: string;
  projectId: number;
  deviceUuid: string | null;
  totalLogs: number;
  recordCount: number;
  warningCount: number;
  errorCount: number;
  firstLogTime: Date;
  lastLogTime: Date;
  logs: Log[];
}

export interface ProjectSummary {
  projectId: number;
  sessionCount: number;
  logCount: number;
  lastActivity: Date;
}

class SessionService {
  /**
   * 获取所有项目列表
   */
  async getAllProjects(): Promise<{
    projects: ProjectSummary[];
  }> {
    const logs = await logRepository.findByFilters(
      {},
      { page: 1, pageSize: 50000 },
    );

    const projectMap = new Map<number, Log[]>();
    logs.forEach((log) => {
      const projectId = log.projectId;
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, []);
      }
      projectMap.get(projectId)!.push(log);
    });

    const projects: ProjectSummary[] = [];
    projectMap.forEach((projectLogs, projectId) => {
      const sessionUuids = new Set(projectLogs.map((log) => log.sessionUuid));
      const times = projectLogs.map((log) => log.createdAt.getTime());
      const lastActivity = new Date(Math.max(...times));

      projects.push({
        projectId,
        sessionCount: sessionUuids.size,
        logCount: projectLogs.length,
        lastActivity,
      });
    });

    projects.sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime(),
    );

    return { projects };
  }

  /**
   * 获取项目的所有会话列表
   */
  async getSessionsByProject(projectId: number): Promise<{
    projectId: number;
    sessionCount: number;
    sessions: SessionSummary[];
  }> {
    const logs = await logRepository.findByFilters(
      { projectId },
      { page: 1, pageSize: 10000 },
    );

    const sessionMap = new Map<string, Log[]>();
    logs.forEach((log) => {
      const sessionUuid = log.sessionUuid;
      if (!sessionMap.has(sessionUuid)) {
        sessionMap.set(sessionUuid, []);
      }
      sessionMap.get(sessionUuid)!.push(log);
    });

    const sessions: SessionSummary[] = [];
    sessionMap.forEach((sessionLogs, sessionUuid) => {
      const recordCount = sessionLogs.filter(
        (log) => log.dataType === "record",
      ).length;
      const warningCount = sessionLogs.filter(
        (log) => log.dataType === "warning",
      ).length;
      const errorCount = sessionLogs.filter(
        (log) => log.dataType === "error",
      ).length;

      const times = sessionLogs.map((log) => log.createdAt.getTime());
      const firstLogTime = new Date(Math.min(...times));
      const lastLogTime = new Date(Math.max(...times));

      const deviceUuid = sessionLogs[0]?.deviceUuid || null;

      sessions.push({
        sessionUuid,
        projectId,
        deviceUuid,
        logCount: sessionLogs.length,
        recordCount,
        warningCount,
        errorCount,
        firstLogTime,
        lastLogTime,
      });
    });

    sessions.sort(
      (a, b) => b.lastLogTime.getTime() - a.lastLogTime.getTime(),
    );

    return {
      projectId,
      sessionCount: sessions.length,
      sessions,
    };
  }

  /**
   * 获取会话详情
   */
  async getSessionDetail(sessionUuid: string): Promise<SessionDetail | null> {
    const logs = await logRepository.findByFilters(
      { sessionUuid },
      { page: 1, pageSize: 10000 },
    );

    if (logs.length === 0) {
      return null;
    }

    const recordCount = logs.filter((log) => log.dataType === "record").length;
    const warningCount = logs.filter(
      (log) => log.dataType === "warning",
    ).length;
    const errorCount = logs.filter((log) => log.dataType === "error").length;

    const times = logs.map((log) => log.createdAt.getTime());
    const firstLogTime = new Date(Math.min(...times));
    const lastLogTime = new Date(Math.max(...times));

    const projectId = logs[0].projectId;
    const deviceUuid = logs[0].deviceUuid;

    logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      sessionUuid,
      projectId,
      deviceUuid,
      totalLogs: logs.length,
      recordCount,
      warningCount,
      errorCount,
      firstLogTime,
      lastLogTime,
      logs,
    };
  }

  // ---- 向后兼容的委托方法 ----

  /**
   * @deprecated 请使用 sessionReportService.getProjectOrganizationReportByDays
   */
  async getProjectOrganizationReportByDays(
    projectId: number,
    startDate: string,
    endDate?: string,
  ) {
    return sessionReportService.getProjectOrganizationReportByDays(
      projectId,
      startDate,
      endDate,
    );
  }

  /**
   * @deprecated 请使用 sessionReportService.getProjectOrganizationReport
   */
  async getProjectOrganizationReport(
    projectId: number,
    startDate: string,
    endDate?: string,
  ): Promise<ProjectOrganizationReport> {
    return sessionReportService.getProjectOrganizationReport(
      projectId,
      startDate,
      endDate,
    );
  }

  /**
   * @deprecated 请使用 sessionReportService.getProjectRawLogs
   */
  async getProjectRawLogs(
    projectId: number,
    startDate: string,
    endDate: string,
  ) {
    return sessionReportService.getProjectRawLogs(
      projectId,
      startDate,
      endDate,
    );
  }
}

export const sessionService = new SessionService();
