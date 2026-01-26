import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../models/User";
import { config } from "../config/env";
import { logger } from "../config/logger";

/**
 * AuthService handles authentication logic for both hardware and UI
 */
export class AuthService {
  private readonly jwtSecret: string;
  private readonly tokenExpiry: string;

  constructor() {
    this.jwtSecret = config.jwtSecret;
    this.tokenExpiry = "24h";
  }

  /**
   * UI Login: Authenticates a user with only a password
   * @returns JWT token if successful, null otherwise
   */
  async login(
    password: string,
  ): Promise<{ token: string; user: Record<string, unknown> } | null> {
    try {
      const username = "admin"; // Using default admin user
      logger.info("Password login attempt");

      // Find user by username
      const user = await User.findOne({ where: { username } });
      if (!user) {
        logger.error("Login failed: Admin user missing from database");
        return null;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        logger.warn("Login failed: Invalid password", { username });
        return null;
      }

      // Generate JWT
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
        },
        this.jwtSecret,
        { expiresIn: this.tokenExpiry as jwt.SignOptions["expiresIn"] },
      );

      // Update last login time
      user.lastLoginAt = new Date();
      await user.save();

      logger.info("User login successful", { username, id: user.id });

      return {
        token,
        user: user.toJSON() as unknown as Record<string, unknown>,
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
