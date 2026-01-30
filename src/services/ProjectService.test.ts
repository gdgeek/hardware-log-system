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
      expect(result[0]).toEqual({
        id: mockProject.id,
        uuid: mockProject.uuid,
        name: mockProject.name,
        hasPassword: false,
        columnMapping: {},
        createdAt: mockProject.createdAt.toISOString(),
        updatedAt: mockProject.updatedAt.toISOString(),
      });
    });

    it("should throw error on repository failure", async () => {
      (projectRepository.findAll as jest.Mock).mockRejectedValue(
        new Error("DB Error"),
      );

      await expect(service.getAllProjects()).rejects.toThrow("DB Error");
    });
  });

  describe("getProjectById", () => {
    it("should return project when found", async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(mockProject);

      const result = await service.getProjectById(1);

      expect(projectRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(expect.objectContaining({ id: 1 }));
    });

    it("should return null when not found", async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await service.getProjectById(999);

      expect(result).toBeNull();
    });
  });

  describe("authenticateProject", () => {
    it("should authenticate successfully when project has no password", async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(mockProject);

      const result = await service.authenticateProject({ projectId: 1 });

      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();
    });

    it("should fail when project does not exist", async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await service.authenticateProject({ projectId: 999 });

      expect(result.success).toBe(false);
      expect(result.message).toBe("项目不存在");
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
      expect(result.message).toBe("该项目需要密码访问");
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
      expect(result.message).toBe("密码错误");
    });

    it("should succeed with correct password", async () => {
      const protectedProject = {
        ...mockProject,
        isPasswordProtected: jest.fn().mockReturnValue(true),
        validatePassword: jest.fn().mockReturnValue(true),
      };
      (projectRepository.findById as jest.Mock).mockResolvedValue(
        protectedProject,
      );

      const result = await service.authenticateProject({
        projectId: 1,
        password: "right",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("createProject", () => {
    it("should create project successfully", async () => {
      (projectRepository.findByUuid as jest.Mock).mockResolvedValue(null);
      (projectRepository.create as jest.Mock).mockResolvedValue(mockProject);

      const data = { uuid: "uuid-123", name: "Test Project" };
      const result = await service.createProject(data);

      expect(projectRepository.create).toHaveBeenCalledWith(data);
      expect(result.id).toBe(mockProject.id);
    });

    it("should throw validation error if UUID exists", async () => {
      (projectRepository.findByUuid as jest.Mock).mockResolvedValue(
        mockProject,
      );

      await expect(
        service.createProject({ uuid: "uuid-123", name: "New" }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw validation error if missing required fields", async () => {
      await expect(
        service.createProject({ uuid: "", name: "Name" } as any),
      ).rejects.toThrow(ValidationError);
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

      expect(projectRepository.update).toHaveBeenCalledWith(1, {
        name: "Updated",
      });
      expect(result.name).toBe("Updated");
    });

    it("should throw error if project not found", async () => {
      (projectRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateProject(999, { name: "Updated" }),
      ).rejects.toThrow("项目不存在");
    });
  });

  describe("deleteProject", () => {
    it("should delete project successfully", async () => {
      (projectRepository.delete as jest.Mock).mockResolvedValue(true);

      const result = await service.deleteProject(1);

      expect(projectRepository.delete).toHaveBeenCalledWith(1);
      expect(result).toBeUndefined();
    });

    it("should throw error if deletion fails", async () => {
      (projectRepository.delete as jest.Mock).mockResolvedValue(false);

      await expect(service.deleteProject(999)).rejects.toThrow(
        "项目不存在或删除失败",
      );
    });
  });
});
