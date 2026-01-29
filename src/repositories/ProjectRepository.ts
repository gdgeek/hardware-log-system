/**
 * Project Repository
 * 项目数据访问层
 */

import { Project, ProjectAttributes, ProjectCreationAttributes } from '../models/Project';
import { DatabaseError } from '../types';
import { logger } from '../config/logger';

export class ProjectRepository {
  /**
   * 根据ID查找项目
   */
  async findById(id: number): Promise<Project | null> {
    try {
      const project = await Project.findByPk(id);
      logger.debug('Project found by ID', { id, found: !!project });
      return project;
    } catch (error) {
      logger.error('Failed to find project by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
      });
      throw new DatabaseError(
        'Failed to find project',
        'DATABASE_ERROR',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 根据UUID查找项目
   */
  async findByUuid(uuid: string): Promise<Project | null> {
    try {
      const project = await Project.findOne({
        where: { uuid },
      });
      logger.debug('Project found by UUID', { uuid, found: !!project });
      return project;
    } catch (error) {
      logger.error('Failed to find project by UUID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        uuid,
      });
      throw new DatabaseError(
        'Failed to find project',
        'DATABASE_ERROR',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 获取所有项目列表
   */
  async findAll(): Promise<Project[]> {
    try {
      const projects = await Project.findAll({
        order: [['name', 'ASC']],
      });
      logger.debug('Projects retrieved', { count: projects.length });
      return projects;
    } catch (error) {
      logger.error('Failed to retrieve projects', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError(
        'Failed to retrieve projects',
        'DATABASE_ERROR',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 创建新项目
   */
  async create(projectData: ProjectCreationAttributes): Promise<Project> {
    try {
      const project = await Project.create(projectData);
      logger.info('Project created', { 
        id: project.id, 
        uuid: project.uuid, 
        name: project.name,
        hasPassword: !!project.password,
      });
      return project;
    } catch (error) {
      logger.error('Failed to create project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectData: { ...projectData, password: projectData.password ? '[MASKED]' : undefined },
      });
      throw new DatabaseError(
        'Failed to create project',
        'DATABASE_ERROR',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 更新项目
   */
  async update(id: number, updateData: Partial<ProjectAttributes>): Promise<Project | null> {
    try {
      const [affectedCount] = await Project.update(updateData, {
        where: { id },
      });

      if (affectedCount === 0) {
        return null;
      }

      const updatedProject = await this.findById(id);
      logger.info('Project updated', { 
        id, 
        affectedCount,
        hasPassword: !!(updateData.password),
      });
      return updatedProject;
    } catch (error) {
      logger.error('Failed to update project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        updateData: { ...updateData, password: updateData.password ? '[MASKED]' : undefined },
      });
      throw new DatabaseError(
        'Failed to update project',
        'DATABASE_ERROR',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 删除项目
   */
  async delete(id: number): Promise<boolean> {
    try {
      const affectedCount = await Project.destroy({
        where: { id },
      });

      const success = affectedCount > 0;
      logger.info('Project deletion attempted', { id, success, affectedCount });
      return success;
    } catch (error) {
      logger.error('Failed to delete project', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
      });
      throw new DatabaseError(
        'Failed to delete project',
        'DATABASE_ERROR',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 验证项目密码
   */
  async validateProjectPassword(projectId: number, password?: string): Promise<boolean> {
    try {
      const project = await this.findById(projectId);
      if (!project) {
        return false;
      }

      const isValid = project.validatePassword(password || '');
      logger.debug('Project password validation', { 
        projectId, 
        hasPassword: project.isPasswordProtected(),
        isValid,
      });
      return isValid;
    } catch (error) {
      logger.error('Failed to validate project password', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
      });
      return false;
    }
  }
}

export const projectRepository = new ProjectRepository();