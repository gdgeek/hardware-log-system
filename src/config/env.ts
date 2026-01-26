import dotenv from "dotenv";
import { logger } from "./logger";

// Load environment variables from .env file
dotenv.config();

/**
 * Environment configuration interface
 */
interface EnvConfig {
  // Server configuration
  nodeEnv: string;
  port: number;

  // Database configuration
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  dbPoolMin: number;
  dbPoolMax: number;

  // Logging configuration
  logLevel: string;
  logFile: string;

  // API configuration
  apiPrefix: string;
  maxPageSize: number;
  defaultPageSize: number;

  // JWT configuration
  jwtSecret: string;
}

/**
 * Validates that a required environment variable is set
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Gets an optional environment variable with a default value
 */
function getEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

/**
 * Gets an optional environment variable as a number with a default value
 */
function getEnvNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(
      `Environment variable ${name} must be a valid number, got: ${value}`,
    );
  }
  return parsed;
}

/**
 * Validates and loads environment configuration
 */
function loadConfig(): EnvConfig {
  try {
    const config: EnvConfig = {
      // Server configuration
      nodeEnv: getEnv("NODE_ENV", "development"),
      port: getEnvNumber("PORT", 3000),

      // Database configuration
      dbHost: requireEnv("DB_HOST"),
      dbPort: getEnvNumber("DB_PORT", 3306),
      dbName: requireEnv("DB_NAME"),
      dbUser: requireEnv("DB_USER"),
      dbPassword: requireEnv("DB_PASSWORD"),
      dbPoolMin: getEnvNumber("DB_POOL_MIN", 2),
      dbPoolMax: getEnvNumber("DB_POOL_MAX", 10),

      // Logging configuration
      logLevel: getEnv("LOG_LEVEL", "info"),
      logFile: getEnv("LOG_FILE", "logs/app.log"),

      // API configuration
      apiPrefix: getEnv("API_PREFIX", "/api"),
      maxPageSize: getEnvNumber("MAX_PAGE_SIZE", 100),
      defaultPageSize: getEnvNumber("DEFAULT_PAGE_SIZE", 20),

      // JWT configuration
      jwtSecret: getEnv(
        "JWT_SECRET",
        "hardware-log-system-secret-key-change-it",
      ),
    };

    // Validate configuration values
    validateConfig(config);

    // Log configuration (with sensitive data masked)
    logConfiguration(config);

    return config;
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Failed to load configuration", { error: error.message });
    }
    throw error;
  }
}

/**
 * Validates configuration values
 */
function validateConfig(config: EnvConfig): void {
  // Validate port range
  if (config.port < 1 || config.port > 65535) {
    throw new Error(`PORT must be between 1 and 65535, got: ${config.port}`);
  }

  // Validate database port range
  if (config.dbPort < 1 || config.dbPort > 65535) {
    throw new Error(
      `DB_PORT must be between 1 and 65535, got: ${config.dbPort}`,
    );
  }

  // Validate pool sizes
  if (config.dbPoolMin < 0) {
    throw new Error(
      `DB_POOL_MIN must be non-negative, got: ${config.dbPoolMin}`,
    );
  }
  if (config.dbPoolMax < config.dbPoolMin) {
    throw new Error(
      `DB_POOL_MAX must be >= DB_POOL_MIN, got: ${config.dbPoolMax} < ${config.dbPoolMin}`,
    );
  }

  // Validate page sizes
  if (config.defaultPageSize < 1) {
    throw new Error(
      `DEFAULT_PAGE_SIZE must be positive, got: ${config.defaultPageSize}`,
    );
  }
  if (config.maxPageSize < config.defaultPageSize) {
    throw new Error(
      `MAX_PAGE_SIZE must be >= DEFAULT_PAGE_SIZE, got: ${config.maxPageSize} < ${config.defaultPageSize}`,
    );
  }

  // Validate log level
  const validLogLevels = ["error", "warn", "info", "debug"];
  if (!validLogLevels.includes(config.logLevel)) {
    throw new Error(
      `LOG_LEVEL must be one of ${validLogLevels.join(", ")}, got: ${config.logLevel}`,
    );
  }
}

/**
 * Logs configuration with sensitive data masked
 */
function logConfiguration(config: EnvConfig): void {
  logger.info("Configuration loaded", {
    nodeEnv: config.nodeEnv,
    port: config.port,
    dbHost: config.dbHost,
    dbPort: config.dbPort,
    dbName: config.dbName,
    dbUser: config.dbUser,
    dbPassword: "***MASKED***",
    dbPoolMin: config.dbPoolMin,
    dbPoolMax: config.dbPoolMax,
    logLevel: config.logLevel,
    logFile: config.logFile,
    apiPrefix: config.apiPrefix,
    maxPageSize: config.maxPageSize,
    defaultPageSize: config.defaultPageSize,
    jwtSecret: "***MASKED***",
  });
}

// Export the loaded configuration
export const config = loadConfig();
