/**
 * Unit tests for AuthService
 */

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { AuthService } from "./AuthService";
import { User } from "../models/User";

// Mock dependencies
jest.mock("jsonwebtoken");
jest.mock("bcrypt");
jest.mock("../models/User");
jest.mock("../config/logger");
jest.mock("../config/env", () => ({
  config: {
    jwtSecret: "test-secret",
  },
}));

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe("login", () => {
    const password = "test-password";
    const mockUser = {
      id: 1,
      username: "admin",
      passwordHash: "hashed-password",
      role: "admin",
      lastLoginAt: null,
      save: jest.fn().mockResolvedValue(true),
      toJSON: jest
        .fn()
        .mockReturnValue({ id: 1, username: "admin", role: "admin" }),
    };

    it("should login successfully with correct password", async () => {
      // Setup mocks
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue("mock-token");

      const result = await authService.login(password);

      expect(User.findOne).toHaveBeenCalledWith({
        where: { username: "admin" },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, "hashed-password");
      expect(jwt.sign).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        token: "mock-token",
        user: { id: 1, username: "admin", role: "admin" },
      });
    });

    it("should return null if admin user is missing", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const result = await authService.login(password);

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it("should return null if password is incorrect", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.login(password);

      expect(result).toBeNull();
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it("should throw error if database fails", async () => {
      const error = new Error("DB Error");
      (User.findOne as jest.Mock).mockRejectedValue(error);

      await expect(authService.login(password)).rejects.toThrow("DB Error");
    });
  });

  describe("verifyAdminToken", () => {
    it("should return decoded payload for valid token", async () => {
      const payload = { id: 1, username: "admin" };
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
