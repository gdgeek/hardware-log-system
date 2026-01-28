/**
 * AuthRoutes - 认证相关的 API 路由
 *
 * 端点：
 * - POST /api/auth/login - 管理员登录
 * - GET /api/auth/verify - 验证 token
 */

import { Router, Request, Response, IRouter } from "express";
import { authService } from "../services/AuthService";
import { adminAuthMiddleware } from "../middleware/AdminAuthMiddleware";
import { validateBody, asyncHandler } from "../middleware";
import { loginSchema } from "../validation/schemas";
import { logger } from "../config/logger";

const router: IRouter = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 管理员登录
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 description: 管理员密码
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: 密码错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { password } = req.body;

    logger.info("收到管理员登录请求", {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    try {
      const result = await authService.login(password);
      
      logger.info("管理员登录成功", {
        username: result.user.username,
        ip: req.ip
      });

      res.status(200).json(result);
    } catch (error) {
      logger.warn("管理员登录失败", {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip
      });

      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: error instanceof Error ? error.message : '登录失败'
        }
      });
    }
  })
);

/**
 * @swagger
 * /auth/verify:
 *   get:
 *     summary: 验证 token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token 有效
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Token 无效
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/verify",
  adminAuthMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    // 如果通过了中间件验证，说明 token 有效
    res.status(200).json({
      valid: true,
      user: req.user
    });
  })
);

export default router;