/**
 * Unit tests for AuthService
 */

import jwt from "jsonwebtoken";
import { AuthService } from "./AuthService";

// Mock dependencies
jest.mock("jsonwebtoken");
jest.mock("../config/logger");
jest.mock("../config/env", () => ({
  config: {
    jwtSecret: "test-secret",
    adminPassword: "test-admin-password",
  },
}));

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe("login", () => {
    it("should login successfully with correct password", async () => {
      (jwt.sign as jest.Mock).mockReturnValue("mock-token");

      const result = await authService.login("test-admin-password");

      expect(jwt.sign).toHaveBeenCalled();
      expect(result).toEqual({
        token: "mock-token",
        user: { username: "admin", role: "admin" },
      });
    });

    it("should return null if password is incorrect", async () => {
      const result = await authService.login("wrong-password");

      expect(result).toBeNull();
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe("verifyAdminToken", () => {
    it("should return decoded payload for valid token", async () => {
      const payload = { username: "admin", role: "admin" };
      (jwt.verify as jest.Mock).mockReturnValue(payload);

      const result = await authService.verifyAdminToken("valid-token");

      expect(jwt.verify).toHaveBeenCalledWith("valid-token", "test-secret");
      expect(result).toEqual(payload);
    });

    it("should return null for invalid token", async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const result = await authService.verifyAdminToken("invalid-token");

      expect(result).toBeNull();
    });
  });
});
