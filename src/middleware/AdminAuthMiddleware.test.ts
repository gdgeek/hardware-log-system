/**
 * Unit tests for AdminAuthMiddleware
 */

import { Request, Response, NextFunction } from "express";
import { adminAuthMiddleware } from "./AdminAuthMiddleware";
import { authService } from "../services/AuthService";

// Mock dependencies
jest.mock("../services/AuthService");
jest.mock("../config/logger");

describe("AdminAuthMiddleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
      path: "/api/v1/logs",
      ip: "127.0.0.1",
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should allow access with a valid token", () => {
    req.headers!.authorization = "Bearer valid-token";
    const payload = { id: "admin", username: "admin", role: "admin" };
    (authService.verifyToken as jest.Mock).mockReturnValue(payload);
    (authService.isAdmin as jest.Mock).mockReturnValue(true);

    adminAuthMiddleware(req as Request, res as Response, next);

    expect(authService.verifyToken).toHaveBeenCalledWith("valid-token");
    expect(authService.isAdmin).toHaveBeenCalledWith(payload);
    expect((req as any).user).toEqual(payload);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should deny access if Authorization header is missing", () => {
    adminAuthMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "UNAUTHORIZED" }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should deny access if Authorization header is not Bearer", () => {
    req.headers!.authorization = "Basic dXNlcjpwYXNz";

    adminAuthMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should deny access if token is invalid or expired", () => {
    req.headers!.authorization = "Bearer invalid-token";
    (authService.verifyToken as jest.Mock).mockImplementation(() => {
      throw new Error("无效的 token");
    });

    adminAuthMiddleware(req as Request, res as Response, next);

    expect(authService.verifyToken).toHaveBeenCalledWith("invalid-token");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: "认证失败",
        }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
