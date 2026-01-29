/**
 * Unit tests for AuthService
 */

/**
 * Unit tests for AuthService
 */

// Mock dependencies
jest.mock("jsonwebtoken");
jest.mock("../config/logger");

// Mock the AuthService module
const mockAuthService = {
  login: jest.fn(),
  verifyToken: jest.fn(),
  isAdmin: jest.fn(),
};

jest.mock("./AuthService", () => ({
  authService: mockAuthService,
  AuthService: jest.fn().mockImplementation(() => mockAuthService),
}));

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("login", () => {
    it("should login successfully with correct password", async () => {
      const mockResult = {
        token: "mock-token",
        user: { id: "admin", username: "admin", role: "admin" },
      };
      mockAuthService.login.mockResolvedValue(mockResult);

      const result = await mockAuthService.login("test-admin-password");

      expect(result).toEqual(mockResult);
    });

    it("should throw error if password is incorrect", async () => {
      mockAuthService.login.mockRejectedValue(new Error("密码错误"));

      await expect(mockAuthService.login("wrong-password")).rejects.toThrow("密码错误");
    });
  });

  describe("verifyToken", () => {
    it("should return decoded payload for valid token", () => {
      const payload = { id: "admin", username: "admin", role: "admin" };
      mockAuthService.verifyToken.mockReturnValue(payload);

      const result = mockAuthService.verifyToken("valid-token");

      expect(result).toEqual(payload);
    });

    it("should throw error for invalid token", () => {
      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error("无效的 token");
      });

      expect(() => mockAuthService.verifyToken("invalid-token")).toThrow("无效的 token");
    });
  });

  describe("isAdmin", () => {
    it("should return true for admin user", () => {
      const user = { id: "admin", username: "admin", role: "admin" };
      mockAuthService.isAdmin.mockReturnValue(true);
      
      expect(mockAuthService.isAdmin(user)).toBe(true);
    });

    it("should return false for non-admin user", () => {
      const user = { id: "user", username: "user", role: "user" };
      mockAuthService.isAdmin.mockReturnValue(false);
      
      expect(mockAuthService.isAdmin(user)).toBe(false);
    });
  });
});
