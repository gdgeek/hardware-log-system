/**
 * SessionRoutes - 会话相关的公开 API 路由（无需认证）
 */

import { Router, Request, Response, IRouter } from "express";
import { sessionService } from "../services/SessionService";
import { asyncHandler } from "../middleware";
import { logger } from "../config/logger";

const router: IRouter = Router();

/**
 * @swagger
 * /sessions/projects:
 *   get:
 *     summary: 获取所有项目列表（公开接口）
 *     tags: [Sessions]
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projects:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       projectId:
 *                         type: integer
 *                       sessionCount:
 *                         type: integer
 *                       logCount:
 *                         type: integer
 */
router.get(
  "/projects",
  asyncHandler(async (_req: Request, res: Response) => {
    logger.info("获取所有项目列表");

    const result = await sessionService.getAllProjects();

    logger.info("项目列表获取成功", {
      projectCount: result.projects.length,
    });

    res.status(200).json(result);
  }),
);

/**
 * @swagger
 * /sessions/project/{projectId}:
 *   get:
 *     summary: 获取项目的所有会话列表（公开接口）
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 项目 ID
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projectId:
 *                   type: integer
 *                 sessionCount:
 *                   type: integer
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: 参数错误
 */
router.get(
  "/project/:projectId",
  asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId, 10);

    if (isNaN(projectId) || projectId < 0) {
      res.status(400).json({
        error: {
          code: "INVALID_PARAMETER",
          message: "Invalid project ID",
        },
      });
      return;
    }

    logger.info("获取项目会话列表", { projectId });

    const result = await sessionService.getSessionsByProject(projectId);

    logger.info("项目会话列表获取成功", {
      projectId,
      sessionCount: result.sessionCount,
    });

    res.status(200).json(result);
  }),
);

/**
 * @swagger
 * /sessions/{sessionUuid}:
 *   get:
 *     summary: 获取会话详情（公开接口）
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: sessionUuid
 *         required: true
 *         schema:
 *           type: string
 *         description: 会话 UUID
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: 会话未找到
 */
router.get(
  "/:sessionUuid",
  asyncHandler(async (req: Request, res: Response) => {
    const sessionUuid = req.params.sessionUuid;

    if (!sessionUuid || sessionUuid.trim() === "") {
      res.status(400).json({
        error: {
          code: "INVALID_PARAMETER",
          message: "Invalid session UUID",
        },
      });
      return;
    }

    logger.info("获取会话详情", { sessionUuid });

    const detail = await sessionService.getSessionDetail(sessionUuid);

    if (!detail) {
      logger.warn("会话未找到", { sessionUuid });
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `Session ${sessionUuid} not found`,
        },
      });
      return;
    }

    logger.info("会话详情获取成功", {
      sessionUuid,
      totalLogs: detail.totalLogs,
    });

    res.status(200).json(detail);
  }),
);

/**
 * @swagger
 * /sessions/reports/project-organization:
 *   get:
 *     summary: 获取项目整理报表（公开接口）
 *     tags: [Sessions]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 项目 ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: 日期 (YYYY-MM-DD 格式)
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: 无效的参数
 */
router.get(
  "/reports/project-organization",
  asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.query.projectId as string, 10);
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    // 兼容旧的单日期参数
    const date = req.query.date as string;

    if (isNaN(projectId) || projectId < 1) {
      res.status(400).json({
        error: {
          code: "INVALID_PARAMETER",
          message: "Invalid project ID",
        },
      });
      return;
    }

    let finalStartDate: string;
    let finalEndDate: string;

    // 如果提供了新的日期范围参数
    if (startDate && endDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        res.status(400).json({
          error: {
            code: "INVALID_PARAMETER",
            message: "Invalid date format, expected YYYY-MM-DD",
          },
        });
        return;
      }
      
      if (new Date(startDate) > new Date(endDate)) {
        res.status(400).json({
          error: {
            code: "INVALID_PARAMETER",
            message: "Start date cannot be later than end date",
          },
        });
        return;
      }
      
      finalStartDate = startDate;
      finalEndDate = endDate;
    } 
    // 兼容旧的单日期参数
    else if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({
          error: {
            code: "INVALID_PARAMETER",
            message: "Invalid date format, expected YYYY-MM-DD",
          },
        });
        return;
      }
      finalStartDate = date;
      finalEndDate = date;
    } else {
      res.status(400).json({
        error: {
          code: "INVALID_PARAMETER",
          message: "Missing date parameters. Provide either 'date' or 'startDate' and 'endDate'",
        },
      });
      return;
    }

    logger.info("获取项目整理报表", { projectId, startDate: finalStartDate, endDate: finalEndDate });

    const report = await sessionService.getProjectOrganizationReport(projectId, finalStartDate, finalEndDate);

    logger.info("项目整理报表获取成功", {
      projectId,
      startDate: finalStartDate,
      endDate: finalEndDate,
      totalDevices: report.totalDevices,
      totalKeys: report.totalKeys,
      totalEntries: report.totalEntries,
    });

    res.status(200).json(report);
  }),
);

/**
 * @swagger
 * /sessions/reports/project-organization-by-days:
 *   get:
 *     summary: 获取项目整理报表（按天分组，公开接口）
 *     tags: [Sessions]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 项目 ID
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: 开始日期 (YYYY-MM-DD 格式)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: 结束日期 (YYYY-MM-DD 格式)
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dailyReports:
 *                   type: array
 *                   items:
 *                     type: object
 *                 combinedReport:
 *                   type: object
 *       400:
 *         description: 无效的参数
 */
router.get(
  "/reports/project-organization-by-days",
  asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.query.projectId as string, 10);
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (isNaN(projectId) || projectId < 1) {
      res.status(400).json({
        error: {
          code: "INVALID_PARAMETER",
          message: "Invalid project ID",
        },
      });
      return;
    }

    if (!startDate || !endDate) {
      res.status(400).json({
        error: {
          code: "INVALID_PARAMETER",
          message: "Both startDate and endDate are required",
        },
      });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      res.status(400).json({
        error: {
          code: "INVALID_PARAMETER",
          message: "Invalid date format, expected YYYY-MM-DD",
        },
      });
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      res.status(400).json({
        error: {
          code: "INVALID_PARAMETER",
          message: "Start date cannot be later than end date",
        },
      });
      return;
    }

    logger.info("获取项目整理报表（按天分组）", { projectId, startDate, endDate });

    const result = await sessionService.getProjectOrganizationReportByDays(projectId, startDate, endDate);

    logger.info("项目整理报表（按天分组）获取成功", {
      projectId,
      startDate,
      endDate,
      dailyReportsCount: result.dailyReports.length,
      combinedTotalDevices: result.combinedReport.totalDevices,
      combinedTotalKeys: result.combinedReport.totalKeys,
      combinedTotalEntries: result.combinedReport.totalEntries,
    });

    res.status(200).json(result);
  }),
);

export default router;
