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

import { Router, Request, Response, IRouter } from 'express';
import { logService } from '../services/LogService';
import { validateBody, validateParams, asyncHandler } from '../middleware';
import { logInputSchema, logFiltersSchema, paginationSchema, logIdParamSchema } from '../validation/schemas';
import { logger } from '../config/logger';

const router: IRouter = Router();

/**
 * POST /api/logs
 * 创建新的日志记录
 * 
 * 需求：1.1, 1.2, 1.3, 1.4, 1.5
 */
router.post(
  '/',
  validateBody(logInputSchema),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('收到创建日志请求', {
      deviceUuid: req.body.deviceUuid,
      dataType: req.body.dataType,
    });

    const log = await logService.createLog(req.body);

    logger.info('日志创建成功', { id: log.id });

    res.status(201).json(log);
  })
);

/**
 * GET /api/logs
 * 查询日志记录（支持过滤和分页）
 * 
 * 查询参数：
 * - deviceUuid: 设备 UUID（可选）
 * - dataType: 数据类型（可选）
 * - startTime: 开始时间（可选）
 * - endTime: 结束时间（可选）
 * - page: 页码（可选，默认 1）
 * - pageSize: 每页大小（可选，默认 20）
 * 
 * 需求：2.1, 2.2, 2.3, 2.4, 2.5
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    // 分离过滤参数和分页参数
    const { page, pageSize, ...filterParams } = req.query;

    // 验证过滤参数
    const filters = logFiltersSchema.validate(filterParams, {
      stripUnknown: true,
      convert: true,
    }).value;

    // 验证分页参数
    const pagination = paginationSchema.validate(
      { page, pageSize },
      { stripUnknown: true, convert: true }
    ).value;

    logger.info('收到查询日志请求', { filters, pagination });

    const result = await logService.queryLogs(filters, pagination);

    logger.info('日志查询成功', {
      resultCount: result.data.length,
      total: result.pagination.total,
    });

    res.status(200).json(result);
  })
);

/**
 * GET /api/logs/:id
 * 获取单条日志记录
 * 
 * 需求：2.1
 */
router.get(
  '/:id',
  validateParams(logIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);

    logger.info('收到获取日志请求', { id });

    const log = await logService.getLogById(id);

    if (!log) {
      logger.warn('日志未找到', { id });
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `日志 ID ${id} 未找到`,
        },
      });
      return;
    }

    logger.info('日志获取成功', { id });

    res.status(200).json(log);
  })
);

export default router;
