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

export default router;
