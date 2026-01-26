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

  it("should allow access with a valid token", async () => {
    req.headers!.authorization = "Bearer valid-token";
    const payload = { id: 1, username: "admin" };
    (authService.verifyAdminToken as jest.Mock).mockResolvedValue(payload);

    await adminAuthMiddleware(req as Request, res as Response, next);

    expect(authService.verifyAdminToken).toHaveBeenCalledWith("valid-token");
    expect((req as any).user).toEqual(payload);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should deny access if Authorization header is missing", async () => {
    await adminAuthMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "UNAUTHORIZED" }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should deny access if Authorization header is not Bearer", async () => {
    req.headers!.authorization = "Basic dXNlcjpwYXNz";

    await adminAuthMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should deny access if token is invalid or expired", async () => {
    req.headers!.authorization = "Bearer invalid-token";
    (authService.verifyAdminToken as jest.Mock).mockResolvedValue(null);

    await adminAuthMiddleware(req as Request, res as Response, next);

    expect(authService.verifyAdminToken).toHaveBeenCalledWith("invalid-token");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: expect.stringContaining("过期"),
        }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
