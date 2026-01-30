import { sessionService } from "./SessionService";
import { logRepository } from "../repositories/LogRepository";
import { projectService } from "./ProjectService";

jest.mock("../repositories/LogRepository", () => ({
  logRepository: {
    findByFilters: jest.fn(),
    aggregateProjectOrganizationByDays: jest.fn(),
    aggregateProjectOrganization: jest.fn(),
  },
}));

jest.mock("./ProjectService", () => ({
  projectService: {
    getProjectById: jest.fn(),
  },
}));

describe("SessionService", () => {
  const mockLogs = [
    {
      projectId: 1,
      sessionUuid: "session-1",
      deviceUuid: "device-1",
      dataType: "record",
      createdAt: new Date("2023-01-01T10:00:00Z"),
    },
    {
      projectId: 1,
      sessionUuid: "session-1",
      deviceUuid: "device-1",
      dataType: "error",
      createdAt: new Date("2023-01-01T10:05:00Z"),
    },
    {
      projectId: 2,
      sessionUuid: "session-2",
      deviceUuid: "device-2",
      dataType: "warning",
      createdAt: new Date("2023-01-01T11:00:00Z"),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllProjects", () => {
    it("should return aggregated project stats", async () => {
      (logRepository.findByFilters as jest.Mock).mockResolvedValue(mockLogs);

      const result = await sessionService.getAllProjects();

      expect(result.projects).toHaveLength(2);
      // Project 1
      const project1 = result.projects.find((p) => p.projectId === 1);
      expect(project1).toBeDefined();
      expect(project1?.logCount).toBe(2);
      expect(project1?.sessionCount).toBe(1);
      // Project 2
      const project2 = result.projects.find((p) => p.projectId === 2);
      expect(project2).toBeDefined();
      expect(project2?.logCount).toBe(1);
    });
  });

  describe("getSessionsByProject", () => {
    it("should return aggregated session stats for a project", async () => {
      const projectLogs = mockLogs.filter((l) => l.projectId === 1);
      (logRepository.findByFilters as jest.Mock).mockResolvedValue(projectLogs);

      const result = await sessionService.getSessionsByProject(1);

      expect(result.projectId).toBe(1);
      expect(result.sessions).toHaveLength(1);

      const session = result.sessions[0];
      expect(session.sessionUuid).toBe("session-1");
      expect(session.logCount).toBe(2);
      expect(session.recordCount).toBe(1);
      expect(session.errorCount).toBe(1);
      expect(session.warningCount).toBe(0);
    });
  });

  describe("getSessionDetail", () => {
    it("should return detailed session info", async () => {
      const sessionLogs = mockLogs.filter((l) => l.sessionUuid === "session-1");
      (logRepository.findByFilters as jest.Mock).mockResolvedValue(sessionLogs);

      const result = await sessionService.getSessionDetail("session-1");

      expect(result).not.toBeNull();
      expect(result?.sessionUuid).toBe("session-1");
      expect(result?.totalLogs).toBe(2);
      expect(result?.errorCount).toBe(1);
    });

    it("should return null if session has no logs", async () => {
      (logRepository.findByFilters as jest.Mock).mockResolvedValue([]);

      const result = await sessionService.getSessionDetail("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("Reporting with column validation", () => {
    const mockReportData = {
      keys: ["col1", "col2"],
      matrix: {
        "session-1": { col1: "val1", col2: "val2" },
      },
      dailyReports: [
        {
          keys: ["col1", "col2"],
          matrix: { "session-1": { col1: "val1", col2: "val2" } },
          date: "2023-01-01",
        },
      ],
      combinedReport: {
        keys: ["col1", "col2"],
        matrix: { "session-1": { col1: "val1", col2: "val2" } },
      },
    };

    const mockProject = {
      columnMapping: { col1: "Column 1", col2: "Column 2" },
    };

    describe("getProjectOrganizationReport", () => {
      it("should apply column mapping", async () => {
        (
          logRepository.aggregateProjectOrganization as jest.Mock
        ).mockResolvedValue({
          keys: mockReportData.keys,
          matrix: mockReportData.matrix,
        });
        (projectService.getProjectById as jest.Mock).mockResolvedValue(
          mockProject,
        );

        const result = await sessionService.getProjectOrganizationReport(
          1,
          "2023-01-01",
        );

        expect(result.keys).toEqual(["Column 1", "Column 2"]);
        expect(result.matrix["session-1"]["Column 1"]).toBe("val1");
      });

      it("should return original keys if mapping fails or project has no mapping", async () => {
        (
          logRepository.aggregateProjectOrganization as jest.Mock
        ).mockResolvedValue({
          keys: mockReportData.keys,
          matrix: mockReportData.matrix,
        });
        (projectService.getProjectById as jest.Mock).mockResolvedValue(null);

        const result = await sessionService.getProjectOrganizationReport(
          1,
          "2023-01-01",
        );

        expect(result.keys).toEqual(["col1", "col2"]);
      });
    });

    describe("getProjectOrganizationReportByDays", () => {
      it("should apply column mapping to daily and combined reports", async () => {
        (
          logRepository.aggregateProjectOrganizationByDays as jest.Mock
        ).mockResolvedValue({
          dailyReports: mockReportData.dailyReports,
          combinedReport: mockReportData.combinedReport,
        });
        (projectService.getProjectById as jest.Mock).mockResolvedValue(
          mockProject,
        );

        const result = await sessionService.getProjectOrganizationReportByDays(
          1,
          "2023-01-01",
        );

        expect(result.dailyReports[0].keys).toEqual(["Column 1", "Column 2"]);
        expect(result.combinedReport.keys).toEqual(["Column 1", "Column 2"]);
      });
    });
  });
});
