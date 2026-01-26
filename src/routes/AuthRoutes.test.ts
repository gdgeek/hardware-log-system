/**
 * Integration tests for AuthRoutes
 */

import request from "supertest";
import express from "express";
import { authService } from "../services/AuthService";
import authRoutes from "./AuthRoutes";

// Mock AuthService
jest.mock("../services/AuthService");

describe("AuthRoutes", () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/auth", authRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /auth/login", () => {
    it("should return 200 and token on successful login", async () => {
      const mockResult = {
        token: "mock-token",
        user: { id: 1, username: "admin" },
      };
      (authService.login as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/auth/login")
        .send({ password: "correct-password" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(authService.login).toHaveBeenCalledWith("correct-password");
    });

    it("should return 400 if password is missing", async () => {
      const response = await request(app).post("/auth/login").send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("BAD_REQUEST");
      expect(authService.login).not.toHaveBeenCalled();
    });

    it("should return 401 if credentials are invalid", async () => {
      (authService.login as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post("/auth/login")
        .send({ password: "wrong-password" });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("GET /auth/verify", () => {
    it("should return 200 and valid:true for a valid token", async () => {
      const payload = { id: 1, username: "admin" };
      (authService.verifyAdminToken as jest.Mock).mockResolvedValue(payload);

      const response = await request(app)
        .get("/auth/verify")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ valid: true, user: payload });
      expect(authService.verifyAdminToken).toHaveBeenCalledWith("valid-token");
    });

    it("should return 401 if Authorization header is missing", async () => {
      const response = await request(app).get("/auth/verify");

      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
    });

    it("should return 401 if token is invalid", async () => {
      (authService.verifyAdminToken as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get("/auth/verify")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
    });
  });
});
