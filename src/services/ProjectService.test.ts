import { ProjectService } from "./ProjectService";
import { projectRepository } from "../repositories/ProjectRepository";
import { ValidationError } from "../types";

// Mock the repository
jest.mock("../repositories/ProjectRepository", () => ({
  projectRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByUuid: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("ProjectService", () => {
  let service: ProjectService;

  const mockProject = {
    id: 1,
    uuid: "uuid-123",
    name: "Test Project",
    isPasswordProtected: jest.fn().mockReturnValue(false),
    validatePassword: jest.fn().mockReturnValue(true),
    getColumnMapping: jest.fn().mockReturnValue({}),
    mapColumnName: jest.fn().mockImplementation((key) => key),
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-02"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectService();
  });

  describe("getAllProjects", () => {
    it("should return all projects mapped correctly", async () => {
      (projectRepository.findAll as jest.Mock).mockResolvedValue([mockProject]);

      const result = await service.getAllProjects();

      expect(projectRepository.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("should throw error on repository failure", async () => {
      (projectRepository.findAll as jest.Mock).mockRejectedValue(
        new Error("DB Error"),
      );
      await expect(service.getAllProjects()).rejects.toThrow("DB Error");
    });

    it("should handle non-Error rejection", async () => {
      (projectRepository.findAll as jest.Mock).mockRejectedValue(
        "String Error",
      );
      // expect original throw
      await expect(service.getAllProjects()).rejects.toBe("String Error");
    });
  });

  describe("getProjectById", () => {
    it("should return project when found", async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(mockProject);
      const result = await service.getProjectById(1);
      expect(result).toEqual(expect.objectContaining({ id: 1 }));
    });

    it("should return null when not found", async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(null);
      const result = await service.getProjectById(999);
      expect(result).toBeNull();
    });

    it("should handle non-Error rejection", async () => {
      (projectRepository.findById as jest.Mock).mockRejectedValue(
        "String Error",
      );
      await expect(service.getProjectById(1)).rejects.toBe("String Error");
    });
  });

  describe("authenticateProject", () => {
    it("should authenticate successfully when project has no password", async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(mockProject);
      const result = await service.authenticateProject({ projectId: 1 });
      expect(result.success).toBe(true);
    });

    it("should fail when project does not exist", async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(null);
      const result = await service.authenticateProject({ projectId: 999 });
      expect(result.success).toBe(false);
    });

    it("should fail when password required but missing", async () => {
      const protectedProject = {
        ...mockProject,
        isPasswordProtected: jest.fn().mockReturnValue(true),
      };
      (projectRepository.findById as jest.Mock).mockResolvedValue(
        protectedProject,
      );
      const result = await service.authenticateProject({ projectId: 1 });
      expect(result.success).toBe(false);
    });

    it("should fail when password incorrect", async () => {
      const protectedProject = {
        ...mockProject,
        isPasswordProtected: jest.fn().mockReturnValue(true),
        validatePassword: jest.fn().mockReturnValue(false),
      };
      (projectRepository.findById as jest.Mock).mockResolvedValue(
        protectedProject,
      );
      const result = await service.authenticateProject({
        projectId: 1,
        password: "wrong",
      });
      expect(result.success).toBe(false);
    });

    it("should handle errors during authentication", async () => {
      (projectRepository.findById as jest.Mock).mockRejectedValue(
        new Error("DB Error"),
      );
      const result = await service.authenticateProject({ projectId: 1 });
      expect(result.success).toBe(false);
      expect(result.message).toBe("认证过程中发生错误");
    });

    it("should handle non-Error rejection", async () => {
      (projectRepository.findById as jest.Mock).mockRejectedValue(
        "String Error",
      );
      const result = await service.authenticateProject({ projectId: 1 });
      expect(result.success).toBe(false);
      expect(result.message).toBe("认证过程中发生错误");
    });
  });

  describe("createProject", () => {
    it("should create project successfully", async () => {
      (projectRepository.findByUuid as jest.Mock).mockResolvedValue(null);
      (projectRepository.create as jest.Mock).mockResolvedValue(mockProject);
      const data = { uuid: "new", name: "New", authKey: "new-key" };
      const result = await service.createProject(data);
      expect(result.id).toBe(mockProject.id);
    });

    it("should create project with custom ID successfully", async () => {
      (projectRepository.findByUuid as jest.Mock).mockResolvedValue(null);
      const customProject = { ...mockProject, id: 100 };
      (projectRepository.create as jest.Mock).mockResolvedValue(customProject);
      const data = { uuid: "new", name: "New", id: 100, authKey: "new-key" };
      const result = await service.createProject(data);
      expect(result.id).toBe(100);
      expect(projectRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ id: 100 }),
      );
    });

    it("should throw validation error if UUID exists", async () => {
      (projectRepository.findByUuid as jest.Mock).mockResolvedValue(
        mockProject,
      );
      await expect(
        service.createProject({ uuid: "uuid-123", name: "New", authKey: "key-123" }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw error and log masked password when creation fails", async () => {
      (projectRepository.findByUuid as jest.Mock).mockResolvedValue(null);
      (projectRepository.create as jest.Mock).mockRejectedValue(
        new Error("DB Error"),
      );
      const data = { uuid: "new", name: "New", password: "secret", authKey: "new-key" };
      await expect(service.createProject(data)).rejects.toThrow("DB Error");
    });

    it("should handle non-Error rejection", async () => {
      (projectRepository.findByUuid as jest.Mock).mockResolvedValue(null);
      (projectRepository.create as jest.Mock).mockRejectedValue("String Error");
      const data = { uuid: "new", name: "New", authKey: "new-key" };
      await expect(service.createProject(data)).rejects.toBe("String Error");
    });
  });

  describe("updateProject", () => {
    it("should update project successfully", async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(mockProject);
      (projectRepository.update as jest.Mock).mockResolvedValue({
        ...mockProject,
        name: "Updated",
      });
      const result = await service.updateProject(1, { name: "Updated" });
      expect(result.name).toBe("Updated");
    });

    it("should success with unique UUID", async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(mockProject);
      (projectRepository.findByUuid as jest.Mock).mockResolvedValue(null);
      (projectRepository.update as jest.Mock).mockResolvedValue({
        ...mockProject,
        uuid: "new-uuid",
      });
      const result = await service.updateProject(1, { uuid: "new-uuid" });
      expect(result.uuid).toBe("new-uuid");
    });

    it("should throw if UUID exists", async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(mockProject);
      (projectRepository.findByUuid as jest.Mock).mockResolvedValue(
        mockProject,
      );
      await expect(
        service.updateProject(1, { uuid: "existing" }),
      ).rejects.toThrow("项目UUID已存在");
    });

    it("should handle non-Error rejection", async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(mockProject);
      (projectRepository.update as jest.Mock).mockRejectedValue("String Error");
      await expect(service.updateProject(1, { name: "Updated" })).rejects.toBe(
        "String Error",
      );
    });
  });

  describe("deleteProject", () => {
    it("should delete project successfully", async () => {
      (projectRepository.delete as jest.Mock).mockResolvedValue(true);
      const result = await service.deleteProject(1);
      expect(result).toBeUndefined();
    });

    it("should throw error if deletion fails", async () => {
      (projectRepository.delete as jest.Mock).mockResolvedValue(false);
      await expect(service.deleteProject(999)).rejects.toThrow(
        "项目不存在或删除失败",
      );
    });

    it("should handle non-Error rejection", async () => {
      (projectRepository.delete as jest.Mock).mockRejectedValue("String Error");
      await expect(service.deleteProject(1)).rejects.toBe("String Error");
    });
  });

  describe("applyColumnMapping", () => {
    it("should return mapped data", async () => {
      const mappedProject = {
        ...mockProject,
        mapColumnName: (k: string) => "Mapped " + k,
      };
      (projectRepository.findById as jest.Mock).mockResolvedValue(
        mappedProject,
      );
      const result = await service.applyColumnMapping(1, { col: "val" });
      expect(result).toEqual({ "Mapped col": "val" });
    });

    it("should return original data on non-Error rejection", async () => {
      (projectRepository.findById as jest.Mock).mockRejectedValue(
        "String Error",
      );
      const data = { col: "val" };
      const result = await service.applyColumnMapping(1, data);
      expect(result).toBe(data);
    });
  });

  describe("getColumnMapping", () => {
    it("should return mapping", async () => {
      const mapping = { k: "v" };
      (projectRepository.findById as jest.Mock).mockResolvedValue({
        ...mockProject,
        getColumnMapping: () => mapping,
      });
      const result = await service.getColumnMapping(1);
      expect(result).toBe(mapping);
    });

    it("should return empty object on non-Error rejection", async () => {
      (projectRepository.findById as jest.Mock).mockRejectedValue(
        "String Error",
      );
      const result = await service.getColumnMapping(1);
      expect(result).toEqual({});
    });
  });
});
