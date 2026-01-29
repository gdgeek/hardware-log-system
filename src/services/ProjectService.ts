/**
 * Project Service
 * 项目业务逻辑层
 */

import { ProjectCreationAttributes } from '../models/Project';
import { projectRepository } from '../repositories/ProjectRepository';
import { ValidationError } from '../types';
import { logger } from '../config/logger';

export interface ProjectInfo {
  id: number;
  uuid: string;
  name: string;
  hasPassword: boolean;
  columnMapping: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAuthRequest {
  projectId: number;
  password?: string;
}

export interface ProjectAuthResponse {
  success: boolean;
  project?: ProjectInfo;
  message?: string;
}

export class ProjectService {
  /**
   * 获取所有项目列表（不包含密码信息）
   */
  async getAllProjects(): Promise<ProjectInfo[]> {
    try {
      const projects = await projectRepository.findAll();
      
      return projects.map(project => ({
        id: project.id,
        uuid: project.uuid,
        name: project.name,
        hasPassword: project.isPasswordProtected(),
        columnMapping: project.getColumnMapping(),
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      }));
    } catch (error) {
      logger.error('Failed to get all projects', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 根据ID获取项目信息
   */
  async getProjectById(id: number): Promise<ProjectInfo | null> {
    try {
      const project = await projectRepository.findById(id);
      if (!project) {
        return null;
      }

      return {
        id: project.id,
        uuid: project.uuid,
        name: project.name,
        hasPassword: project.isPasswordProtected(),
        columnMapping: project.getColumnMapping(),
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get project by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
      });
      throw error;
    }
  }

  /**
   * 验证项目访问权限
   */
  async authenticateProject(authRequest: ProjectAuthRequest): Promise<ProjectAuthResponse> {
    try {
      const { projectId, password } = authRequest;

      const project = await projectRepository.findById(projectId);
      if (!project) {
        return {
          success: false,
          message: '项目不存在',
        };
      }

      // 检查密码
      if (project.isPasswordProtected()) {
        if (!password) {
          return {
            success: false,
            message: '该项目需要密码访问',
          };
        }

        if (!project.validatePassword(password)) {
          return {
            success: false,
            message: '密码错误',
          };
        }
      }

      // 认证成功
      return {
        success: true,
        project: {
          id: project.id,
          uuid: project.uuid,
          name: project.name,
          hasPassword: project.isPasswordProtected(),
          columnMapping: project.getColumnMapping(),
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      logger.error('Failed to authenticate project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId: authRequest.projectId,
      });
      return {
        success: false,
        message: '认证过程中发生错误',
      };
    }
  }

  /**
   * 创建新项目
   */
  async createProject(projectData: ProjectCreationAttributes): Promise<ProjectInfo> {
    try {
      // 验证必填字段
      if (!projectData.uuid || !projectData.name) {
        throw new ValidationError('项目UUID和名称不能为空');
      }

      // 检查UUID是否已存在
      const existingProject = await projectRepository.findByUuid(projectData.uuid);
      if (existingProject) {
        throw new ValidationError('项目UUID已存在');
      }

      const project = await projectRepository.create(projectData);

      return {
        id: project.id,
        uuid: project.uuid,
        name: project.name,
        hasPassword: project.isPasswordProtected(),
        columnMapping: project.getColumnMapping(),
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error('Failed to create project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectData: { ...projectData, password: projectData.password ? '[MASKED]' : undefined },
      });
      throw error;
    }
  }

  /**
   * 更新项目
   */
  async updateProject(id: number, projectData: Partial<ProjectCreationAttributes>): Promise<ProjectInfo> {
    try {
      const project = await projectRepository.findById(id);
      if (!project) {
        throw new ValidationError('项目不存在');
      }

      // 如果更新 UUID，检查是否已存在
      if (projectData.uuid && projectData.uuid !== project.uuid) {
        const existingProject = await projectRepository.findByUuid(projectData.uuid);
        if (existingProject) {
          throw new ValidationError('项目UUID已存在');
        }
      }

      const updatedProject = await projectRepository.update(id, projectData);
      if (!updatedProject) {
        throw new ValidationError('更新项目失败');
      }

      return {
        id: updatedProject.id,
        uuid: updatedProject.uuid,
        name: updatedProject.name,
        hasPassword: updatedProject.isPasswordProtected(),
        columnMapping: updatedProject.getColumnMapping(),
        createdAt: updatedProject.createdAt.toISOString(),
        updatedAt: updatedProject.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error('Failed to update project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        projectData: { ...projectData, password: projectData.password ? '[MASKED]' : undefined },
      });
      throw error;
    }
  }

  /**
   * 删除项目
   */
  async deleteProject(id: number): Promise<void> {
    try {
      const success = await projectRepository.delete(id);
      if (!success) {
        throw new ValidationError('项目不存在或删除失败');
      }
    } catch (error) {
      logger.error('Failed to delete project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
      });
      throw error;
    }
  }

  /**
   * 应用列名映射到数据
   */
  async applyColumnMapping(projectId: number, data: Record<string, any>): Promise<Record<string, any>> {
    try {
      const project = await projectRepository.findById(projectId);
      if (!project) {
        return data; // 项目不存在时返回原数据
      }

      const mappedData: Record<string, any> = {};

      for (const [key, value] of Object.entries(data)) {
        const mappedKey = project.mapColumnName(key);
        mappedData[mappedKey] = value;
      }

      return mappedData;
    } catch (error) {
      logger.error('Failed to apply column mapping', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
      });
      return data; // 出错时返回原数据
    }
  }

  /**
   * 获取项目的列名映射
   */
  async getColumnMapping(projectId: number): Promise<Record<string, string>> {
    try {
      const project = await projectRepository.findById(projectId);
      return project ? project.getColumnMapping() : {};
    } catch (error) {
      logger.error('Failed to get column mapping', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
      });
      return {};
    }
  }
}

export const projectService = new ProjectService();