/**
 * Express 类型扩展
 */

import { AuthUser } from '../services/AuthService';

declare namespace Express {
  interface Request {
    requestId: string;
    user?: AuthUser;
  }
}
