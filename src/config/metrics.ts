/**
 * Prometheus 监控指标配置
 */

import client from 'prom-client';

// 创建 Registry
export const register = new client.Registry();

// 添加默认指标（CPU、内存、事件循环等）
client.collectDefaultMetrics({ register });

// HTTP 请求计数器
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

// HTTP 请求延迟直方图
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// 日志创建计数器
export const logsCreatedTotal = new client.Counter({
  name: 'logs_created_total',
  help: 'Total number of logs created',
  labelNames: ['data_type', 'project_name'],
  registers: [register],
});

// 数据库连接池状态
export const dbPoolConnections = new client.Gauge({
  name: 'db_pool_connections',
  help: 'Database connection pool status',
  labelNames: ['state'],
  registers: [register],
});

// Redis 连接状态
export const redisConnectionStatus = new client.Gauge({
  name: 'redis_connection_status',
  help: 'Redis connection status (1=connected, 0=disconnected)',
  registers: [register],
});

// 缓存命中率
export const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  registers: [register],
});

export const cacheMisses = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  registers: [register],
});

// 错误计数器
export const errorsTotal = new client.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code'],
  registers: [register],
});
