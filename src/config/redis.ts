/**
 * Redis 缓存配置
 */

import Redis from "ioredis";
import { logger } from "./logger";
import { cacheHits, cacheMisses, redisConnectionStatus } from "./metrics";

// Redis 配置
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0", 10),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  ttl: parseInt(process.env.REDIS_TTL || "300", 10),
};

// 创建 Redis 客户端
let redis: Redis | null = null;

/**
 * 获取 Redis 客户端
 */
export function getRedisClient(): Redis | null {
  return redis;
}

/**
 * 初始化 Redis 连接
 */
export async function initRedis(): Promise<boolean> {
  if (process.env.REDIS_ENABLED !== "true") {
    logger.info("Redis 缓存已禁用");
    redisConnectionStatus.set(0);
    return false;
  }

  try {
    redis = new Redis(redisConfig);

    redis.on("error", (err) => {
      logger.error("Redis 连接错误", { error: err.message });
      redisConnectionStatus.set(0);
    });

    redis.on("connect", () => {
      logger.info("Redis 连接成功", {
        host: redisConfig.host,
        port: redisConfig.port,
      });
      redisConnectionStatus.set(1);
    });

    redis.on("close", () => {
      redisConnectionStatus.set(0);
    });

    await redis.connect();
    return true;
  } catch (error) {
    logger.warn("Redis 连接失败，将禁用缓存", {
      error: error instanceof Error ? error.message : "未知错误",
    });
    redis = null;
    redisConnectionStatus.set(0);
    return false;
  }
}

/**
 * 关闭 Redis 连接
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    redisConnectionStatus.set(0);
    logger.info("Redis 连接已关闭");
  }
}

/**
 * 缓存服务
 */
export const cacheService = {
  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;

    try {
      const data = await redis.get(key);
      if (data) {
        logger.debug("缓存命中", { key });
        cacheHits.inc();
        return JSON.parse(data) as T;
      }
      cacheMisses.inc();
      return null;
    } catch (error) {
      logger.warn("缓存读取失败", { key, error: (error as Error).message });
      cacheMisses.inc();
      return null;
    }
  },

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒），默认使用配置值或 300 秒
   */
  async set(
    key: string,
    value: unknown,
    ttl = redisConfig.ttl,
  ): Promise<boolean> {
    if (!redis) return false;

    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      logger.debug("缓存设置成功", { key, ttl });
      return true;
    } catch (error) {
      logger.warn("缓存设置失败", { key, error: (error as Error).message });
      return false;
    }
  },

  /**
   * 删除缓存
   */
  async del(key: string): Promise<boolean> {
    if (!redis) return false;

    try {
      await redis.del(key);
      logger.debug("缓存删除成功", { key });
      return true;
    } catch (error) {
      logger.warn("缓存删除失败", { key, error: (error as Error).message });
      return false;
    }
  },

  /**
   * 删除匹配模式的缓存
   */
  async delPattern(pattern: string): Promise<boolean> {
    if (!redis) return false;

    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.debug("批量缓存删除成功", { pattern, count: keys.length });
      }
      return true;
    } catch (error) {
      logger.warn("批量缓存删除失败", {
        pattern,
        error: (error as Error).message,
      });
      return false;
    }
  },

  /**
   * 检查 Redis 是否可用
   */
  isAvailable(): boolean {
    return redis !== null && redis.status === "ready";
  },
};
