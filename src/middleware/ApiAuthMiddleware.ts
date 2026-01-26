import { Request, Response, NextFunction } from "express";
import { config } from "../config/env";
import { logger } from "../config/logger";

/**
 * Middleware to authenticate API requests using X-Auth-Key header
 */
export function apiAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authKey = req.headers["x-auth-key"] as string;

  if (!authKey) {
    logger.warn("API access denied: No auth key provided", {
      path: req.path,
      ip: req.ip,
    });
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "认证失败：缺少 X-Auth-Key",
      },
    });
    return;
  }

  if (authKey !== config.authKey) {
    logger.warn("API access denied: Invalid auth key", {
      path: req.path,
      ip: req.ip,
    });
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "认证失败：无效的 Auth Key",
      },
    });
    return;
  }

  next();
}

export default apiAuthMiddleware;
