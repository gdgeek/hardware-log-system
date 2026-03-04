import {
  sessionReportService,
  applyColumnMappingToReport,
} from "./SessionReportService";
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

const mockAggregateOrg = logRepository.aggregateProjectOrganization as jest.Mock;
const mockAggregateByDays = logRepository.aggregateProjectOrganizationByDays as jest.Mock;
const mockFindByFilters = logRepository.findByFilters as jest.Mock;
const mockGetProjectById = projectService.getProjectById as jest.Mock;

describe("applyColumnMappingToReport", () => {
  it("should map keys and matrix using columnMapping", () => {
    const result = applyColumnMappingToReport(
      ["col1", "col2"],
      { "s1": { col1: "v1", col2: "v2" } },
      { col1: "Column 1", col2: "Column 2" },
    );

    expect(result.keys).toEqual(["Column 1", "Column 2"]);
    expect(result.matrix["s1"]["Column 1"]).toBe("v1");
    expect(result.matrix["s1"]["Column 2"]).toBe("v2");
  });

  it("should keep original key when no mapping exists", () => {
    const result = applyColumnMappingToReport(
      ["col1", "unmapped"],
      { "s1": { col1: "v1", unmapped: "v2" } },
      { col1: "Column 1" },
    );

    expect(result.keys).toEqual(["Column 1", "unmapped"]);
    expect(result.matrix["s1"]["unmapped"]).toBe("v2");
  });

  it("should handle empty inputs", () => {
    const result = applyColumnMappingToReport([], {}, {});

    expect(result.keys).toEqual([]);
    expect(result.matrix).toEqual({});
  });

  it("should handle multiple sessions in matrix", () => {
    const result = applyColumnMappingToReport(
      ["a"],
      {
        "s1": { a: "1" },
        "s2": { a: "2" },
      },
      { a: "Alpha" },
    );

    expect(result.matrix["s1"]["Alpha"]).toBe("1");
    expect(result.matrix["s2"]["Alpha"]).toBe("2");
  });

  it("should handle null values in matrix", () => {
    const result = applyColumnMappingToReport(
      ["col1"],
      { "s1": { col1: null } },
      { col1: "Column 1" },
    );

    expect(result.matrix["s1"]["Column 1"]).toBeNull();
  });
});

describe("SessionReportService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProjectOrganizationReport", () => {
    const baseReport = {
      projectId: 1,
      startDate: "2023-01-01",
      endDate: "2023-01-01",
      devices: ["s1"],
      keys: ["col1", "col2"],
      matrix: { "s1": { col1: "val1", col2: "val2" } },
      sessionInfo: {},
      totalDevices: 1,
      totalKeys: 2,
      totalEntries: 2,
    };

    it("should apply column mapping when project has mapping", async () => {
      mockAggregateOrg.mockResolvedValue(baseReport);
      mockGetProjectById.mockResolvedValue({
        columnMapping: { col1: "Column 1", col2: "Column 2" },
      });

      const result = await sessionReportService.getProjectOrganizationReport(
        1,
        "2023-01-01",
      );

      expect(result.keys).toEqual(["Column 1", "Column 2"]);
      expect(result.matrix["s1"]["Column 1"]).toBe("val1");
    });

    it("should return original report when project has no mapping", async () => {
      mockAggregateOrg.mockResolvedValue(baseReport);
      mockGetProjectById.mockResolvedValue(null);

      const result = await sessionReportService.getProjectOrganizationReport(
        1,
        "2023-01-01",
      );

      expect(result.keys).toEqual(["col1", "col2"]);
    });

    it("should return original report when project has empty columnMapping", async () => {
      mockAggregateOrg.mockResolvedValue(baseReport);
      mockGetProjectById.mockResolvedValue({ columnMapping: null });

      const result = await sessionReportService.getProjectOrganizationReport(
        1,
        "2023-01-01",
      );

      expect(result.keys).toEqual(["col1", "col2"]);
    });

    it("should return original report when getProjectById throws", async () => {
      mockAggregateOrg.mockResolvedValue(baseReport);
      mockGetProjectById.mockRejectedValue(new Error("DB Error"));

      const result = await sessionReportService.getProjectOrganizationReport(
        1,
        "2023-01-01",
      );

      expect(result.keys).toEqual(["col1", "col2"]);
    });

    it("should use startDate as endDate when endDate is not provided", async () => {
      mockAggregateOrg.mockResolvedValue(baseReport);
      mockGetProjectById.mockResolvedValue(null);

      await sessionReportService.getProjectOrganizationReport(1, "2023-01-01");

      expect(mockAggregateOrg).toHaveBeenCalledWith(1, "2023-01-01", "2023-01-01");
    });

    it("should pass endDate when provided", async () => {
      mockAggregateOrg.mockResolvedValue(baseReport);
      mockGetProjectById.mockResolvedValue(null);

      await sessionReportService.getProjectOrganizationReport(
        1,
        "2023-01-01",
        "2023-01-07",
      );

      expect(mockAggregateOrg).toHaveBeenCalledWith(1, "2023-01-01", "2023-01-07");
    });
  });

  describe("getProjectOrganizationReportByDays", () => {
    const baseResult = {
      dailyReports: [
        {
          date: "2023-01-01",
          keys: ["col1", "col2"],
          matrix: { "s1": { col1: "val1", col2: "val2" } },
        },
      ],
      combinedReport: {
        keys: ["col1", "col2"],
        matrix: { "s1": { col1: "val1", col2: "val2" } },
      },
    };

    it("should apply column mapping to daily and combined reports", async () => {
      mockAggregateByDays.mockResolvedValue(baseResult);
      mockGetProjectById.mockResolvedValue({
        columnMapping: { col1: "Column 1", col2: "Column 2" },
      });

      const result =
        await sessionReportService.getProjectOrganizationReportByDays(
          1,
          "2023-01-01",
        );

      expect(result.dailyReports[0].keys).toEqual(["Column 1", "Column 2"]);
      expect(result.combinedReport.keys).toEqual(["Column 1", "Column 2"]);
    });

    it("should return original when project has no mapping", async () => {
      mockAggregateByDays.mockResolvedValue(baseResult);
      mockGetProjectById.mockResolvedValue(null);

      const result =
        await sessionReportService.getProjectOrganizationReportByDays(
          1,
          "2023-01-01",
        );

      expect(result.dailyReports[0].keys).toEqual(["col1", "col2"]);
      expect(result.combinedReport.keys).toEqual(["col1", "col2"]);
    });

    it("should return original when getProjectById throws", async () => {
      mockAggregateByDays.mockResolvedValue(baseResult);
      mockGetProjectById.mockRejectedValue(new Error("DB Error"));

      const result =
        await sessionReportService.getProjectOrganizationReportByDays(
          1,
          "2023-01-01",
        );

      expect(result.dailyReports[0].keys).toEqual(["col1", "col2"]);
    });

    it("should use startDate as endDate when endDate is not provided", async () => {
      mockAggregateByDays.mockResolvedValue(baseResult);
      mockGetProjectById.mockResolvedValue(null);

      await sessionReportService.getProjectOrganizationReportByDays(
        1,
        "2023-01-01",
      );

      expect(mockAggregateByDays).toHaveBeenCalledWith(
        1,
        "2023-01-01",
        "2023-01-01",
      );
    });

    it("should handle multiple daily reports", async () => {
      const multiDayResult = {
        dailyReports: [
          {
            date: "2023-01-01",
            keys: ["col1"],
            matrix: { "s1": { col1: "day1" } },
          },
          {
            date: "2023-01-02",
            keys: ["col1"],
            matrix: { "s2": { col1: "day2" } },
          },
        ],
        combinedReport: {
          keys: ["col1"],
          matrix: { "s1": { col1: "day1" }, "s2": { col1: "day2" } },
        },
      };
      mockAggregateByDays.mockResolvedValue(multiDayResult);
      mockGetProjectById.mockResolvedValue({
        columnMapping: { col1: "Column 1" },
      });

      const result =
        await sessionReportService.getProjectOrganizationReportByDays(
          1,
          "2023-01-01",
          "2023-01-02",
        );

      expect(result.dailyReports).toHaveLength(2);
      expect(result.dailyReports[0].keys).toEqual(["Column 1"]);
      expect(result.dailyReports[1].keys).toEqual(["Column 1"]);
      expect(result.combinedReport.matrix["s1"]["Column 1"]).toBe("day1");
      expect(result.combinedReport.matrix["s2"]["Column 1"]).toBe("day2");
    });
  });

  describe("getProjectRawLogs", () => {
    it("should return logs sorted by createdAt ascending", async () => {
      const older = new Date("2023-01-01T08:00:00Z");
      const newer = new Date("2023-01-01T18:00:00Z");
      mockFindByFilters.mockResolvedValue([
        { createdAt: newer, projectId: 1 },
        { createdAt: older, projectId: 1 },
      ]);

      const result = await sessionReportService.getProjectRawLogs(
        1,
        "2023-01-01",
        "2023-01-01",
      );

      expect(result.logs[0].createdAt).toEqual(older);
      expect(result.logs[1].createdAt).toEqual(newer);
      expect(result.totalLogs).toBe(2);
      expect(result.projectId).toBe(1);
      expect(result.startDate).toBe("2023-01-01");
      expect(result.endDate).toBe("2023-01-01");
    });

    it("should return empty logs when no data exists", async () => {
      mockFindByFilters.mockResolvedValue([]);

      const result = await sessionReportService.getProjectRawLogs(
        1,
        "2023-01-01",
        "2023-01-07",
      );

      expect(result.logs).toHaveLength(0);
      expect(result.totalLogs).toBe(0);
    });

    it("should pass correct date range to repository", async () => {
      mockFindByFilters.mockResolvedValue([]);

      await sessionReportService.getProjectRawLogs(
        1,
        "2023-01-01",
        "2023-01-07",
      );

      expect(mockFindByFilters).toHaveBeenCalledWith(
        {
          projectId: 1,
          startTime: new Date("2023-01-01T00:00:00.000Z"),
          endTime: new Date("2023-01-07T23:59:59.999Z"),
        },
        { page: 1, pageSize: 50000 },
      );
    });
  });
});
