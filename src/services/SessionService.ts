/**
 * SessionService - 会话相关业务逻辑
 */

import { logRepository } from "../repositories/LogRepository";
import { Log } from "../models/Log";

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

class SessionService {
  /**
   * 获取项目的所有会话列表
   */
  async getSessionsByProject(projectId: number): Promise<{
    projectId: number;
    sessionCount: number;
    sessions: SessionSummary[];
  }> {
    // 获取该项目的所有日志（不分页，获取全部）
    const logs = await logRepository.findByFilters(
      { projectId },
      { page: 1, pageSize: 10000 }, // 使用大的 pageSize 获取所有日志
    );

    // 按 sessionUuid 分组
    const sessionMap = new Map<string, Log[]>();
    logs.forEach((log) => {
      const sessionUuid = log.sessionUuid;
      if (!sessionMap.has(sessionUuid)) {
        sessionMap.set(sessionUuid, []);
      }
      sessionMap.get(sessionUuid)!.push(log);
    });

    // 生成会话汇总
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

      // 获取设备UUID（取第一个日志的设备UUID）
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

    // 按最后日志时间倒序排序
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
    // 获取该会话的所有日志（不分页，获取全部）
    const logs = await logRepository.findByFilters(
      { sessionUuid },
      { page: 1, pageSize: 10000 }, // 使用大的 pageSize 获取所有日志
    );

    if (logs.length === 0) {
      return null;
    }

    // 统计信息
    const recordCount = logs.filter((log) => log.dataType === "record").length;
    const warningCount = logs.filter(
      (log) => log.dataType === "warning",
    ).length;
    const errorCount = logs.filter((log) => log.dataType === "error").length;

    const times = logs.map((log) => log.createdAt.getTime());
    const firstLogTime = new Date(Math.min(...times));
    const lastLogTime = new Date(Math.max(...times));

    // 获取项目ID和设备UUID（取第一个日志的）
    const projectId = logs[0].projectId;
    const deviceUuid = logs[0].deviceUuid;

    // 按时间排序（最新的在前）
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
}

export const sessionService = new SessionService();
