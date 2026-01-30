import { ProjectRepository } from "./ProjectRepository";
import { Project } from "../models/Project";
import { DatabaseError } from "../types";

// Mock the Project model
jest.mock("../models/Project");

describe("ProjectRepository", () => {
  let repository: ProjectRepository;

  // Mock data
  const mockProjectData = {
    id: 1,
    uuid: "test-uuid-123",
    name: "Test Project",
    createdAt: new Date(),
    updatedAt: new Date(),
    isPasswordProtected: jest.fn().mockReturnValue(false),
    validatePassword: jest.fn().mockReturnValue(true),
    getColumnMapping: jest.fn().mockReturnValue({}),
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    repository = new ProjectRepository();
  });

  describe("findById", () => {
    it("should find a project by ID", async () => {
      (Project.findByPk as jest.Mock).mockResolvedValue(mockProjectData);

      const result = await repository.findById(1);

      expect(Project.findByPk).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProjectData);
    });

    it("should return null when project not found", async () => {
      (Project.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(Project.findByPk).toHaveBeenCalledWith(999);
      expect(result).toBeNull();
    });

    it("should throw DatabaseError on DB error", async () => {
      (Project.findByPk as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await expect(repository.findById(1)).rejects.toThrow(DatabaseError);
    });

    it("should handle non-Error rejection", async () => {
      (Project.findByPk as jest.Mock).mockRejectedValue("String Error");

      await expect(repository.findById(1)).rejects.toThrow(DatabaseError);
    });
  });

  describe("findByUuid", () => {
    it("should find a project by UUID", async () => {
      (Project.findOne as jest.Mock).mockResolvedValue(mockProjectData);

      const result = await repository.findByUuid("test-uuid-123");

      expect(Project.findOne).toHaveBeenCalledWith({
        where: { uuid: "test-uuid-123" },
      });
      expect(result).toEqual(mockProjectData);
    });

    it("should return null when project not found", async () => {
      (Project.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByUuid("non-existent");

      expect(result).toBeNull();
    });

    it("should throw DatabaseError on DB error", async () => {
      (Project.findOne as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await expect(repository.findByUuid("uuid")).rejects.toThrow(
        DatabaseError,
      );
    });

    it("should handle non-Error rejection", async () => {
      (Project.findOne as jest.Mock).mockRejectedValue("String Error");

      await expect(repository.findByUuid("uuid")).rejects.toThrow(
        DatabaseError,
      );
    });
  });

  describe("findAll", () => {
    it("should return all projects", async () => {
      const projects = [mockProjectData, { ...mockProjectData, id: 2 }];
      (Project.findAll as jest.Mock).mockResolvedValue(projects);

      const result = await repository.findAll();

      expect(Project.findAll).toHaveBeenCalledWith({
        order: [["name", "ASC"]],
      });
      expect(result).toHaveLength(2);
      expect(result).toEqual(projects);
    });

    it("should throw DatabaseError on DB error", async () => {
      (Project.findAll as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await expect(repository.findAll()).rejects.toThrow(DatabaseError);
    });

    it("should handle non-Error rejection", async () => {
      (Project.findAll as jest.Mock).mockRejectedValue("String Error");

      await expect(repository.findAll()).rejects.toThrow(DatabaseError);
    });
  });

  describe("create", () => {
    const newProjectData = {
      uuid: "new-uuid",
      name: "New Project",
    };

    it("should create a project", async () => {
      (Project.create as jest.Mock).mockResolvedValue({
        ...mockProjectData,
        ...newProjectData,
      });

      const result = await repository.create(newProjectData);

      expect(Project.create).toHaveBeenCalledWith(newProjectData);
      expect(result).toEqual(expect.objectContaining(newProjectData));
    });

    it("should throw DatabaseError on DB error", async () => {
      (Project.create as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await expect(repository.create(newProjectData)).rejects.toThrow(
        DatabaseError,
      );
    });

    it("should handle non-Error rejection", async () => {
      (Project.create as jest.Mock).mockRejectedValue("String Error");

      await expect(repository.create(newProjectData)).rejects.toThrow(
        DatabaseError,
      );
    });
  });

  describe("update", () => {
    const updateData = { name: "Updated Name" };

    it("should update a project when found", async () => {
      // Mock update returning [affectedCount]
      (Project.update as jest.Mock).mockResolvedValue([1]);
      // Mock findById to return the updated project
      (Project.findByPk as jest.Mock).mockResolvedValue({
        ...mockProjectData,
        ...updateData,
      });

      const result = await repository.update(1, updateData);

      expect(Project.update).toHaveBeenCalledWith(updateData, {
        where: { id: 1 },
      });
      expect(result).toEqual(expect.objectContaining(updateData));
    });

    it("should return null when project not found (affectedCount 0)", async () => {
      (Project.update as jest.Mock).mockResolvedValue([0]);

      const result = await repository.update(999, updateData);

      expect(result).toBeNull();
    });

    it("should throw DatabaseError on DB error", async () => {
      (Project.update as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await expect(repository.update(1, updateData)).rejects.toThrow(
        DatabaseError,
      );
    });

    it("should handle non-Error rejection", async () => {
      (Project.update as jest.Mock).mockRejectedValue("String Error");

      await expect(repository.update(1, updateData)).rejects.toThrow(
        DatabaseError,
      );
    });
  });

  describe("delete", () => {
    it("should delete a project", async () => {
      (Project.destroy as jest.Mock).mockResolvedValue(1);

      const result = await repository.delete(1);

      expect(Project.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toBe(true);
    });

    it("should return false when project not found", async () => {
      (Project.destroy as jest.Mock).mockResolvedValue(0);

      const result = await repository.delete(999);

      expect(result).toBe(false);
    });

    it("should throw DatabaseError on DB error", async () => {
      (Project.destroy as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await expect(repository.delete(1)).rejects.toThrow(DatabaseError);
    });

    it("should handle non-Error rejection", async () => {
      (Project.destroy as jest.Mock).mockRejectedValue("String Error");

      await expect(repository.delete(1)).rejects.toThrow(DatabaseError);
    });
  });

  describe("validateProjectPassword", () => {
    it("should validate password successfully", async () => {
      const projectMock = { ...mockProjectData };
      projectMock.validatePassword.mockReturnValue(true);
      (Project.findByPk as jest.Mock).mockResolvedValue(projectMock);

      const result = await repository.validateProjectPassword(1, "password");

      expect(result).toBe(true);
      expect(projectMock.validatePassword).toHaveBeenCalledWith("password");
    });

    it("should return false if project not found", async () => {
      (Project.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await repository.validateProjectPassword(1, "password");

      expect(result).toBe(false);
    });

    it("should return false on DB error", async () => {
      (Project.findByPk as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const result = await repository.validateProjectPassword(1, "password");

      expect(result).toBe(false);
    });

    it("should handle non-Error rejection", async () => {
      (Project.findByPk as jest.Mock).mockRejectedValue("String Error");

      const result = await repository.validateProjectPassword(1, "password");

      expect(result).toBe(false);
    });

    it("should use empty string default if password undefined", async () => {
      const projectMock = { ...mockProjectData };
      projectMock.validatePassword.mockReturnValue(false);
      (Project.findByPk as jest.Mock).mockResolvedValue(projectMock);

      await repository.validateProjectPassword(1, undefined);

      expect(projectMock.validatePassword).toHaveBeenCalledWith("");
    });
  });
});
