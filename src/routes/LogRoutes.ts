/**
 * LogRoutes - 日志相关的 API 路由
 *
 * 端点：
 * - POST /api/logs - 创建日志
 * - GET /api/logs - 查询日志（支持过滤和分页）
 * - GET /api/logs/:id - 获取单条日志
 *
 * 需求：1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { Router, Request, Response, IRouter } from "express";
import { logService } from "../services/LogService";
import { validateBody, validateParams, asyncHandler } from "../middleware";
import {
  logInputSchema,
  logFiltersSchema,
  paginationSchema,
  logIdParamSchema,
} from "../validation/schemas";
import { logger } from "../config/logger";
import { adminAuthMiddleware } from "../middleware/AdminAuthMiddleware";


const router: IRouter = Router();

/**
 * @swagger
 * /logs:
 *   post:
 *     summary: 创建日志记录
 *     tags: [Logs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LogInput'
 *     responses:
 *       201:
 *         description: 日志创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Log'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/",
  validateBody(logInputSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // 服务器自动获取客户端 IP，忽略请求体中的 clientIp
    const clientIp = req.ip || req.socket.remoteAddress || null;

    logger.info("收到创建日志请求", {
      deviceUuid: req.body.deviceUuid,
      dataType: req.body.dataType,
      clientIp,
    });

    const log = await logService.createLog({
      ...req.body,
      clientIp,
    });

    logger.info("日志创建成功", { id: log.id });

    res.status(201).json(log);
  }),
);

/**
 * @swagger
 * /logs:
 *   get:
 *     summary: 查询日志记录（需要认证）
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceUuid
 *         schema:
 *           type: string
 *         description: 设备 UUID
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: integer
 *         description: 项目 ID
 *       - in: query
 *         name: dataType
 *         schema:
 *           type: string
 *           enum: [record, warning, error]
 *         description: 数据类型
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始时间
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束时间
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页大小
 *     responses:
 *       200:
 *         description: 查询成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedLogs'
 */
router.get(
  "/",
  adminAuthMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize, ...filterParams } = req.query;

    const filters = logFiltersSchema.validate(filterParams, {
      stripUnknown: true,
      convert: true,
    }).value;

    const pagination = paginationSchema.validate(
      { page, pageSize },
      { stripUnknown: true, convert: true },
    ).value;

    logger.info("收到查询日志请求", { filters, pagination });

    const result = await logService.queryLogs(filters, pagination);

    logger.info("日志查询成功", {
      resultCount: result.data.length,
      total: result.pagination.total,
    });

    res.status(200).json(result);
  }),
);

/**
 * @swagger
 * /logs/{id}:
 *   get:
 *     summary: 获取单条日志（需要认证）
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 日志 ID
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Log'
 *       404:
 *         description: 日志未找到
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:id",
  adminAuthMiddleware,
  validateParams(logIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);

    logger.info("收到获取日志请求", { id });

    const log = await logService.getLogById(id);

    if (!log) {
      logger.warn("日志未找到", { id });
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `日志 ID ${id} 未找到`,
        },
      });
      return;
    }

    logger.info("日志获取成功", { id });

    res.status(200).json(log);
  }),
);

/**
 * @swagger
 * /logs/{id}:
 *   delete:
 *     summary: 删除单条日志（需要认证）
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 日志 ID
 *     responses:
 *       204:
 *         description: 删除成功
 *       401:
 *         description: 未授权
 *       404:
 *         description: 日志未找到
 */
router.delete(
  "/:id",
  adminAuthMiddleware,
  validateParams(logIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);

    logger.info("收到删除日志请求", { id });

    const deleted = await logService.deleteLog(id);

    if (!deleted) {
      logger.warn("日志未找到", { id });
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `日志 ID ${id} 未找到`,
        },
      });
      return;
    }

    logger.info("日志删除成功", { id });

    res.status(204).send();
  }),
);

export default router;
