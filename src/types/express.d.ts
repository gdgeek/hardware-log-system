/**
 * Express 类型扩展
 */

import { AuthUser } from '../services/AuthService';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: AuthUser;
    }
  }
}
