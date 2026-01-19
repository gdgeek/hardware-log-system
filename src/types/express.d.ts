/**
 * Express 类型扩展
 */

declare namespace Express {
  interface Request {
    requestId: string;
  }
}
