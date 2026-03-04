import { sessionService } from "./SessionService";
import { logRepository } from "../repositories/LogRepository";

jest.mock("../repositories/LogRepository", () => ({
  logRepository: {
    findByFilters: jest.fn(),
  },
}));

jest.mock("./SessionReportService", () => ({
  sessionReportService: {
    getProjectOrganizationReport: jest.fn(),
    getProjectOrganizationReportByDays: jest.fn(),
    getProjectRawLogs: jest.fn(),
  },
}));

const mockFindByFilters = logRepository.findByFilters as jest.Mock;

describe("SessionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllProjects", () => {
    it("should return aggregated project stats sorted by last activity", async () => {
      mockFindByFilters.mockResolvedValue([
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "record",
          createdAt: new Date("2023-01-01T10:00:00Z"),
        },
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "error",
          createdAt: new Date("2023-01-01T10:05:00Z"),
        },
        {
          projectId: 2,
          sessionUuid: "s2",
          deviceUuid: "d2",
          dataType: "warning",
          createdAt: new Date("2023-01-01T11:00:00Z"),
        },
      ]);

      const result = await sessionService.getAllProjects();

      expect(result.projects).toHaveLength(2);
      // Project 2 has later activity, should be first
      expect(result.projects[0].projectId).toBe(2);
      expect(result.projects[1].projectId).toBe(1);

      const p1 = result.projects.find((p) => p.projectId === 1)!;
      expect(p1.logCount).toBe(2);
      expect(p1.sessionCount).toBe(1);

      const p2 = result.projects.find((p) => p.projectId === 2)!;
      expect(p2.logCount).toBe(1);
      expect(p2.sessionCount).toBe(1);
    });

    it("should return empty array when no logs exist", async () => {
      mockFindByFilters.mockResolvedValue([]);

      const result = await sessionService.getAllProjects();

      expect(result.projects).toHaveLength(0);
    });

    it("should count multiple sessions per project correctly", async () => {
      mockFindByFilters.mockResolvedValue([
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "record",
          createdAt: new Date("2023-01-01T10:00:00Z"),
        },
        {
          projectId: 1,
          sessionUuid: "s2",
          deviceUuid: "d2",
          dataType: "record",
          createdAt: new Date("2023-01-01T11:00:00Z"),
        },
        {
          projectId: 1,
          sessionUuid: "s3",
          deviceUuid: "d3",
          dataType: "error",
          createdAt: new Date("2023-01-01T12:00:00Z"),
        },
      ]);

      const result = await sessionService.getAllProjects();

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].sessionCount).toBe(3);
      expect(result.projects[0].logCount).toBe(3);
    });

    it("should use lastActivity from the most recent log", async () => {
      const latestDate = new Date("2023-06-15T18:00:00Z");
      mockFindByFilters.mockResolvedValue([
        {
          projectId: 5,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "record",
          createdAt: new Date("2023-01-01T10:00:00Z"),
        },
        {
          projectId: 5,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "record",
          createdAt: latestDate,
        },
      ]);

      const result = await sessionService.getAllProjects();

      expect(result.projects[0].lastActivity).toEqual(latestDate);
    });
  });

  describe("getSessionsByProject", () => {
    it("should return aggregated session stats for a project", async () => {
      mockFindByFilters.mockResolvedValue([
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "record",
          createdAt: new Date("2023-01-01T10:00:00Z"),
        },
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "error",
          createdAt: new Date("2023-01-01T10:05:00Z"),
        },
      ]);

      const result = await sessionService.getSessionsByProject(1);

      expect(result.projectId).toBe(1);
      expect(result.sessionCount).toBe(1);
      expect(result.sessions).toHaveLength(1);

      const session = result.sessions[0];
      expect(session.sessionUuid).toBe("s1");
      expect(session.logCount).toBe(2);
      expect(session.recordCount).toBe(1);
      expect(session.errorCount).toBe(1);
      expect(session.warningCount).toBe(0);
      expect(session.deviceUuid).toBe("d1");
    });

    it("should return empty sessions when no logs exist", async () => {
      mockFindByFilters.mockResolvedValue([]);

      const result = await sessionService.getSessionsByProject(999);

      expect(result.projectId).toBe(999);
      expect(result.sessionCount).toBe(0);
      expect(result.sessions).toHaveLength(0);
    });

    it("should sort sessions by lastLogTime descending", async () => {
      mockFindByFilters.mockResolvedValue([
        {
          projectId: 1,
          sessionUuid: "old-session",
          deviceUuid: "d1",
          dataType: "record",
          createdAt: new Date("2023-01-01T08:00:00Z"),
        },
        {
          projectId: 1,
          sessionUuid: "new-session",
          deviceUuid: "d2",
          dataType: "record",
          createdAt: new Date("2023-01-01T12:00:00Z"),
        },
      ]);

      const result = await sessionService.getSessionsByProject(1);

      expect(result.sessions[0].sessionUuid).toBe("new-session");
      expect(result.sessions[1].sessionUuid).toBe("old-session");
    });

    it("should count all data types correctly", async () => {
      mockFindByFilters.mockResolvedValue([
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "record",
          createdAt: new Date("2023-01-01T10:00:00Z"),
        },
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "warning",
          createdAt: new Date("2023-01-01T10:01:00Z"),
        },
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "warning",
          createdAt: new Date("2023-01-01T10:02:00Z"),
        },
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "error",
          createdAt: new Date("2023-01-01T10:03:00Z"),
        },
      ]);

      const result = await sessionService.getSessionsByProject(1);
      const session = result.sessions[0];

      expect(session.recordCount).toBe(1);
      expect(session.warningCount).toBe(2);
      expect(session.errorCount).toBe(1);
      expect(session.logCount).toBe(4);
    });

    it("should compute firstLogTime and lastLogTime correctly", async () => {
      const first = new Date("2023-01-01T08:00:00Z");
      const last = new Date("2023-01-01T18:00:00Z");
      mockFindByFilters.mockResolvedValue([
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "record",
          createdAt: last,
        },
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "record",
          createdAt: first,
        },
      ]);

      const result = await sessionService.getSessionsByProject(1);

      expect(result.sessions[0].firstLogTime).toEqual(first);
      expect(result.sessions[0].lastLogTime).toEqual(last);
    });
  });

  describe("getSessionDetail", () => {
    it("should return detailed session info", async () => {
      mockFindByFilters.mockResolvedValue([
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "record",
          createdAt: new Date("2023-01-01T10:00:00Z"),
        },
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "error",
          createdAt: new Date("2023-01-01T10:05:00Z"),
        },
      ]);

      const result = await sessionService.getSessionDetail("s1");

      expect(result).not.toBeNull();
      expect(result!.sessionUuid).toBe("s1");
      expect(result!.projectId).toBe(1);
      expect(result!.deviceUuid).toBe("d1");
      expect(result!.totalLogs).toBe(2);
      expect(result!.recordCount).toBe(1);
      expect(result!.errorCount).toBe(1);
      expect(result!.warningCount).toBe(0);
    });

    it("should return null if session has no logs", async () => {
      mockFindByFilters.mockResolvedValue([]);

      const result = await sessionService.getSessionDetail("non-existent");

      expect(result).toBeNull();
    });

    it("should sort logs by createdAt descending (newest first)", async () => {
      const older = new Date("2023-01-01T10:00:00Z");
      const newer = new Date("2023-01-01T10:05:00Z");
      mockFindByFilters.mockResolvedValue([
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "record",
          createdAt: older,
        },
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "error",
          createdAt: newer,
        },
      ]);

      const result = await sessionService.getSessionDetail("s1");

      expect(result!.logs[0].createdAt).toEqual(newer);
      expect(result!.logs[1].createdAt).toEqual(older);
    });

    it("should compute firstLogTime and lastLogTime correctly", async () => {
      const first = new Date("2023-01-01T08:00:00Z");
      const last = new Date("2023-01-01T18:00:00Z");
      mockFindByFilters.mockResolvedValue([
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "record",
          createdAt: last,
        },
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "record",
          createdAt: first,
        },
      ]);

      const result = await sessionService.getSessionDetail("s1");

      expect(result!.firstLogTime).toEqual(first);
      expect(result!.lastLogTime).toEqual(last);
    });

    it("should count all data types correctly", async () => {
      mockFindByFilters.mockResolvedValue([
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "record",
          createdAt: new Date("2023-01-01T10:00:00Z"),
        },
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "warning",
          createdAt: new Date("2023-01-01T10:01:00Z"),
        },
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "warning",
          createdAt: new Date("2023-01-01T10:02:00Z"),
        },
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "error",
          createdAt: new Date("2023-01-01T10:03:00Z"),
        },
        {
          projectId: 1,
          sessionUuid: "s1",
          deviceUuid: "d1",
          dataType: "error",
          createdAt: new Date("2023-01-01T10:04:00Z"),
        },
      ]);

      const result = await sessionService.getSessionDetail("s1");

      expect(result!.recordCount).toBe(1);
      expect(result!.warningCount).toBe(2);
      expect(result!.errorCount).toBe(2);
      expect(result!.totalLogs).toBe(5);
    });
  });

  describe("backward-compatible delegation methods", () => {
    const { sessionReportService } = require("./SessionReportService");

    it("should delegate getProjectOrganizationReport", async () => {
      const mockReport = { keys: [], matrix: {} };
      sessionReportService.getProjectOrganizationReport.mockResolvedValue(
        mockReport,
      );

      const result = await sessionService.getProjectOrganizationReport(
        1,
        "2023-01-01",
      );

      expect(
        sessionReportService.getProjectOrganizationReport,
      ).toHaveBeenCalledWith(1, "2023-01-01", undefined);
      expect(result).toBe(mockReport);
    });

    it("should delegate getProjectOrganizationReportByDays", async () => {
      const mockResult = { dailyReports: [], combinedReport: {} };
      sessionReportService.getProjectOrganizationReportByDays.mockResolvedValue(
        mockResult,
      );

      const result = await sessionService.getProjectOrganizationReportByDays(
        1,
        "2023-01-01",
        "2023-01-07",
      );

      expect(
        sessionReportService.getProjectOrganizationReportByDays,
      ).toHaveBeenCalledWith(1, "2023-01-01", "2023-01-07");
      expect(result).toBe(mockResult);
    });

    it("should delegate getProjectRawLogs", async () => {
      const mockResult = { logs: [], totalLogs: 0 };
      sessionReportService.getProjectRawLogs.mockResolvedValue(mockResult);

      const result = await sessionService.getProjectRawLogs(
        1,
        "2023-01-01",
        "2023-01-07",
      );

      expect(sessionReportService.getProjectRawLogs).toHaveBeenCalledWith(
        1,
        "2023-01-01",
        "2023-01-07",
      );
      expect(result).toBe(mockResult);
    });
  });
});
