import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { logger } from "../config/logger";

/**
 * AuthService handles authentication logic for the admin UI
 * Uses environment variable password instead of database
 */
export class AuthService {
  private readonly jwtSecret: string;
  private readonly adminPassword: string;
  private readonly tokenExpiry: string;

  constructor() {
    this.jwtSecret = config.jwtSecret;
    this.adminPassword = config.adminPassword;
    this.tokenExpiry = "24h";
  }

  /**
   * UI Login: Authenticates with environment variable password
   * @returns JWT token if successful, null otherwise
   */
  async login(
    password: string,
  ): Promise<{ token: string; user: Record<string, unknown> } | null> {
    try {
      logger.info("Password login attempt");

      // Verify password against environment variable
      if (password !== this.adminPassword) {
        logger.warn("Login failed: Invalid password");
        return null;
      }

      // Generate JWT
      const token = jwt.sign(
        {
          username: "admin",
          role: "admin",
        },
        this.jwtSecret,
        { expiresIn: this.tokenExpiry as jwt.SignOptions["expiresIn"] },
      );

      logger.info("Admin login successful");

      return {
        token,
        user: {
          username: "admin",
          role: "admin",
        },
      };
    } catch (error) {
      logger.error("Login error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Verifies an admin JWT token
   * @returns Decoded payload if valid, null otherwise
   */
  async verifyAdminToken(
    token: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as Record<
        string,
        unknown
      >;
      return decoded;
    } catch (error) {
      logger.debug("Admin token verification failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }
}

export const authService = new AuthService();
export default authService;
