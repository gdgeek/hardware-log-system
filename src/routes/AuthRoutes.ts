import { Router, Request, Response } from "express";
import { authService } from "../services/AuthService";
import { asyncHandler } from "../middleware";

const router = Router();

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
 *     responses:
 *       200:
 *         description: 登录成功
 *       401:
 *         description: 用户名或密码错误
 */
router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "密码不能为空",
        },
      });
      return;
    }

    const result = await authService.login(password);

    if (!result) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "用户名或密码错误",
        },
      });
      return;
    }

    res.status(200).json(result);
  }),
);

/**
 * @swagger
 * /auth/verify:
 *   get:
 *     summary: 验证 Token 有效性
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token 有效
 *       401:
 *         description: Token 无效或过期
 */
router.get(
  "/verify",
  asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ valid: false });
      return;
    }

    const token = authHeader.split(" ")[1];
    const payload = await authService.verifyAdminToken(token);

    if (!payload) {
      res.status(401).json({ valid: false });
      return;
    }

    res.status(200).json({ valid: true, user: payload });
  }),
);

export default router;
