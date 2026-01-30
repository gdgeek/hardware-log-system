import { Sequelize } from "sequelize";
import { config } from "./env";
import { logger, logDatabaseOperation } from "./logger";

/**
 * Sequelize instance for database connection
 */
export const sequelize = new Sequelize({
  host: config.dbHost,
  port: config.dbPort,
  database: config.dbName,
  username: config.dbUser,
  password: config.dbPassword,
  dialect: "mysql",

  // 字符集配置 - 解决中文乱码问题
  dialectOptions: {
    charset: "utf8mb4",
  },

  // Connection pool configuration
  pool: {
    min: config.dbPoolMin,
    max: config.dbPoolMax,
    acquire: 30000, // Maximum time (ms) to try to get connection before throwing error
    idle: 10000, // Maximum time (ms) that a connection can be idle before being released
  },

  // Logging configuration
  logging: (sql: string, timing?: number) => {
    if (config.nodeEnv === "development") {
      logger.debug("SQL Query", { sql, timing });
    }
  },

  // Disable automatic timestamp fields (we'll manage them manually)
  define: {
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  },
});

/**
 * Tests the database connection
 * @returns Promise that resolves if connection is successful
 * @throws Error if connection fails
 */
export async function testConnection(): Promise<void> {
  const startTime = Date.now();

  try {
    await sequelize.authenticate();
    const duration = Date.now() - startTime;

    logDatabaseOperation("Connection Test", duration, true, {
      host: config.dbHost,
      database: config.dbName,
    });

    logger.info("Database connection established successfully", {
      host: config.dbHost,
      database: config.dbName,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logDatabaseOperation("Connection Test", duration, false, {
      host: config.dbHost,
      database: config.dbName,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    logger.error("Unable to connect to the database", {
      host: config.dbHost,
      database: config.dbName,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : error,
    });

    throw new Error(
      `Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Closes the database connection gracefully
 * @returns Promise that resolves when connection is closed
 */
export async function closeConnection(): Promise<void> {
  try {
    await sequelize.close();
    logger.info("Database connection closed successfully");
  } catch (error) {
    logger.error("Error closing database connection", {
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : error,
    });
    throw error;
  }
}

/**
 * Gets the current connection pool status
 * @returns Object with pool statistics
 */
export function getPoolStatus(): {
  size: number;
  available: number;
  using: number;
  waiting: number;
} {
  const connectionManager = sequelize.connectionManager as unknown as {
    pool: {
      size: number;
      available: number;
      using: number;
      waiting: number;
    };
  };
  const pool = connectionManager.pool;

  return {
    size: pool?.size || 0,
    available: pool?.available || 0,
    using: pool?.using || 0,
    waiting: pool?.waiting || 0,
  };
}

/**
 * Checks if the database connection is healthy
 * @returns Promise that resolves to true if healthy, false otherwise
 */
export async function isHealthy(): Promise<boolean> {
  try {
    await sequelize.query("SELECT 1");
    return true;
  } catch (error) {
    logger.error("Database health check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}
