/**
 * Project Routes
 * 项目管理相关路由
 */

import { Router, Request, Response } from "express";
import { projectService } from "../services/ProjectService";
import {
  validateBody,
  validateParams,
} from "../middleware/ValidationMiddleware";
import { adminAuthMiddleware } from "../middleware/AdminAuthMiddleware";
import { logger } from "../config/logger";
import Joi from "joi";

const router: Router = Router();

// 项目认证验证模式
const projectAuthSchema = Joi.object({
  projectId: Joi.number().integer().min(1).required(),
  password: Joi.string().optional().allow(""),
});

// 项目创建验证模式
const createProjectSchema = Joi.object({
  id: Joi.number().integer().min(1).optional(),
  uuid: Joi.string().min(1).max(36).required(),
  name: Joi.string().min(1).max(255).required(),
  password: Joi.string().optional().allow("").allow(null),
  columnMapping: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  authKey: Joi.string().min(1).max(255).optional().allow(null), // authKey可选且可为null
});

// 项目ID参数验证模式
const projectIdSchema = Joi.object({
  id: Joi.number().integer().min(1).required(),
});

/**
 * GET /api/v1/projects
 * 获取所有项目列表（公开接口，不需要管理员权限）
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const projects = await projectService.getAllProjects();

    logger.info("Get all projects", {
      method: req.method,
      path: req.path,
      projectCount: projects.length,
    });

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    logger.error("Failed to get all projects", {
      method: req.method,
      path: req.path,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "获取项目列表失败",
      },
    });
  }
});

/**
 * POST /api/v1/projects/auth
 * 项目认证接口（公开接口）
 */
router.post(
  "/auth",
  validateBody(projectAuthSchema),
  async (req: Request, res: Response) => {
    try {
      const { projectId, password } = req.body;

      const authResult = await projectService.authenticateProject({
        projectId,
        password,
      });

      const statusCode = authResult.success ? 200 : 401;

      logger.info("Project authentication", {
        method: req.method,
        path: req.path,
        projectId,
        success: authResult.success,
        statusCode,
      });

      res.status(statusCode).json(authResult);
    } catch (error) {
      logger.error("Project authentication failed", {
        method: req.method,
        path: req.path,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      res.status(500).json({
        success: false,
        message: "认证过程中发生错误",
      });
    }
  },
);

/**
 * GET /api/v1/projects/:id
 * 获取特定项目信息（需要管理员权限）
 */
router.get(
  "/:id",
  adminAuthMiddleware,
  validateParams(projectIdSchema),
  async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id, 10);
      const project = await projectService.getProjectById(projectId);

      if (!project) {
        logger.warn("Project not found", {
          method: req.method,
          path: req.path,
          projectId,
        });
        return res.status(404).json({
          error: {
            code: "PROJECT_NOT_FOUND",
            message: "项目不存在",
          },
        });
      }

      logger.info("Get project by ID", {
        method: req.method,
        path: req.path,
        projectId,
      });
      return res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      logger.error("Failed to get project by ID", {
        method: req.method,
        path: req.path,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "获取项目信息失败",
        },
      });
    }
  },
);

/**
 * POST /api/v1/projects/auto-add
 * 自动添加项目（公开接口，无需管理员权限）
 * 用于从外部API自动创建项目
 */
router.post(
  "/auto-add",
  validateBody(createProjectSchema),
  async (req: Request, res: Response) => {
    try {
      const projectData = req.body;
      const project = await projectService.createProject(projectData);

      logger.info("Project auto-added", {
        method: req.method,
        path: req.path,
        projectId: project.id,
        projectUuid: project.uuid,
      });

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error) {
      const statusCode =
        error instanceof Error && error.message.includes("已存在") ? 409 : 500;

      logger.error("Failed to auto-add project", {
        method: req.method,
        path: req.path,
        statusCode,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      res.status(statusCode).json({
        error: {
          code: statusCode === 409 ? "PROJECT_EXISTS" : "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "创建项目失败",
        },
      });
    }
  },
);

/**
 * POST /api/v1/projects
 * 创建新项目（需要管理员权限）
 */
router.post(
  "/",
  adminAuthMiddleware,
  validateBody(createProjectSchema),
  async (req: Request, res: Response) => {
    try {
      const projectData = req.body;
      const project = await projectService.createProject(projectData);

      logger.info("Project created", {
        method: req.method,
        path: req.path,
        projectId: project.id,
        projectUuid: project.uuid,
      });

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error) {
      const statusCode =
        error instanceof Error && error.message.includes("已存在") ? 409 : 500;

      logger.error("Failed to create project", {
        method: req.method,
        path: req.path,
        statusCode,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      res.status(statusCode).json({
        error: {
          code: statusCode === 409 ? "PROJECT_EXISTS" : "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "创建项目失败",
        },
      });
    }
  },
);

/**
 * PUT /api/v1/projects/:id
 * 更新项目信息（需要管理员权限）
 */
router.put(
  "/:id",
  adminAuthMiddleware,
  validateParams(projectIdSchema),
  validateBody(createProjectSchema),
  async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id, 10);
      const projectData = req.body;

      const existingProject = await projectService.getProjectById(projectId);
      if (!existingProject) {
        logger.warn("Project not found for update", {
          method: req.method,
          path: req.path,
          projectId,
        });
        return res.status(404).json({
          error: {
            code: "PROJECT_NOT_FOUND",
            message: "项目不存在",
          },
        });
      }

      const updatedProject = await projectService.updateProject(
        projectId,
        projectData,
      );

      logger.info("Project updated", {
        method: req.method,
        path: req.path,
        projectId,
        projectUuid: updatedProject.uuid,
      });

      return res.json({
        success: true,
        data: updatedProject,
      });
    } catch (error) {
      const statusCode =
        error instanceof Error && error.message.includes("已存在") ? 409 : 500;

      logger.error("Failed to update project", {
        method: req.method,
        path: req.path,
        statusCode,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return res.status(statusCode).json({
        error: {
          code: statusCode === 409 ? "PROJECT_EXISTS" : "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "更新项目失败",
        },
      });
    }
  },
);

/**
 * DELETE /api/v1/projects/:id
 * 删除项目（需要管理员权限）
 */
router.delete(
  "/:id",
  adminAuthMiddleware,
  validateParams(projectIdSchema),
  async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id, 10);

      const existingProject = await projectService.getProjectById(projectId);
      if (!existingProject) {
        logger.warn("Project not found for deletion", {
          method: req.method,
          path: req.path,
          projectId,
        });
        return res.status(404).json({
          error: {
            code: "PROJECT_NOT_FOUND",
            message: "项目不存在",
          },
        });
      }

      await projectService.deleteProject(projectId);

      logger.info("Project deleted", {
        method: req.method,
        path: req.path,
        projectId,
        projectUuid: existingProject.uuid,
      });

      return res.json({
        success: true,
        message: "项目删除成功",
      });
    } catch (error) {
      logger.error("Failed to delete project", {
        method: req.method,
        path: req.path,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "删除项目失败",
        },
      });
    }
  },
);

/**
 * GET /api/v1/projects/:id/column-mapping
 * 获取项目的列名映射（公开接口）
 */
router.get(
  "/:id/column-mapping",
  validateParams(projectIdSchema),
  async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id, 10);
      const columnMapping = await projectService.getColumnMapping(projectId);

      logger.info("Get column mapping", {
        method: req.method,
        path: req.path,
        projectId,
      });
      res.json({
        success: true,
        data: columnMapping,
      });
    } catch (error) {
      logger.error("Failed to get column mapping", {
        method: req.method,
        path: req.path,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "获取列名映射失败",
        },
      });
    }
  },
);

export default router;
