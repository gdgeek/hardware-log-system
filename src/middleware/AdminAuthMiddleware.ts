import { Request, Response, NextFunction } from "express";
import { authService } from "../services/AuthService";
import { logger } from "../config/logger";

/**
 * Middleware to authenticate administration requests from the UI
 */
export async function adminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn("Admin access denied: No token provided", {
      path: req.path,
      ip: req.ip,
    });
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "认证失败：请先登录",
      },
    });
    return;
  }

  const token = authHeader.split(" ")[1];
  const payload = await authService.verifyAdminToken(token);

  if (!payload) {
    logger.warn("Admin access denied: Invalid or expired token", {
      path: req.path,
      ip: req.ip,
    });
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "认证失败：登录已过期",
      },
    });
    return;
  }

  // Attach user info to request
  (req as Request & { user: Record<string, unknown> }).user = payload;

  next();
}

export default adminAuthMiddleware;
