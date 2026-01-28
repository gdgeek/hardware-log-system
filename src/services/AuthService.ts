/**
 * AuthService - 认证服务
 * 
 * 提供简单的密码认证和 JWT token 管理
 */

import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

class AuthService {
  private readonly adminPassword: string;
  private readonly jwtSecret: string;

  constructor() {
    this.adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    this.jwtSecret = process.env.JWT_SECRET || 'hardware-log-system-secret-key';
  }

  /**
   * 管理员登录
   */
  async login(password: string): Promise<LoginResult> {
    logger.info('管理员登录尝试');

    if (password !== this.adminPassword) {
      logger.warn('管理员登录失败：密码错误');
      throw new Error('密码错误');
    }

    const user: AuthUser = {
      id: 'admin',
      username: 'admin',
      role: 'admin'
    };

    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      this.jwtSecret,
      { 
        expiresIn: '24h',
        issuer: 'hardware-log-system'
      }
    );

    logger.info('管理员登录成功', { username: user.username });

    return {
      token,
      user
    };
  }

  /**
   * 验证 JWT token
   */
  verifyToken(token: string): AuthUser {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      return {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role
      };
    } catch (error) {
      logger.warn('Token 验证失败', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error('无效的 token');
    }
  }

  /**
   * 检查是否为管理员
   */
  isAdmin(user: AuthUser): boolean {
    return user.role === 'admin';
  }
}

export const authService = new AuthService();