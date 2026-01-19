/**
 * ReportRoutes - 报表相关的 API 路由
 * 
 * 端点：
 * - GET /api/reports/device/:uuid - 设备统计报表
 * - GET /api/reports/timerange - 时间段统计报表
 * - GET /api/reports/errors - 错误统计报表
 * 
 * 需求：3.1, 3.2, 3.3, 3.4
 */

import { Router, Request, Response, IRouter } from 'express';
import { reportService } from '../services/ReportService';
import { validateParams, validateQuery, asyncHandler } from '../middleware';
import { deviceUuidParamSchema, timeRangeQuerySchema } from '../validation/schemas';
import { logger } from '../config/logger';

const router: IRouter = Router();

/**
 * GET /api/reports/device/:uuid
 * 获取设备统计报表
 * 
 * 需求：3.1
 */
router.get(
  '/device/:uuid',
  validateParams(deviceUuidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { uuid } = req.params;

    logger.info('收到设备报表请求', { uuid });

    const report = await reportService.generateDeviceReport(uuid);

    logger.info('设备报表生成成功', {
      uuid,
      totalLogs: report.totalLogs,
    });

    res.status(200).json(report);
  })
);

/**
 * GET /api/reports/timerange
 * 获取时间段统计报表
 * 
 * 查询参数：
 * - startTime: 开始时间（ISO 8601 格式）
 * - endTime: 结束时间（ISO 8601 格式）
 * 
 * 需求：3.2
 */
router.get(
  '/timerange',
  validateQuery(timeRangeQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { startTime, endTime } = req.query;

    logger.info('收到时间段报表请求', { startTime, endTime });

    const report = await reportService.generateTimeRangeReport(
      new Date(startTime as string),
      new Date(endTime as string)
    );

    logger.info('时间段报表生成成功', {
      totalLogs: report.totalLogs,
      deviceCount: report.deviceCount,
    });

    res.status(200).json(report);
  })
);

/**
 * GET /api/reports/errors
 * 获取错误统计报表
 * 
 * 需求：3.3
 */
router.get(
  '/errors',
  asyncHandler(async (_req: Request, res: Response) => {
    logger.info('收到错误报表请求');

    const report = await reportService.generateErrorReport();

    logger.info('错误报表生成成功', {
      totalErrors: report.totalErrors,
      errorCount: report.errors.length,
    });

    res.status(200).json(report);
  })
);

export default router;
