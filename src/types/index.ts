/**
 * Log data types
 */
export type DataType = "record" | "warning" | "error";

/**
 * Input data for creating a log entry
 */
export interface LogInput {
  deviceUuid: string;
  sessionUuid: string;
  projectId: number;
  timestamp: number;
  dataType: DataType;
  key: string;
  value: string;
  clientIp?: string; // Internal field for server-detected IP
}

/**
 * Log entry output format
 */
export interface LogOutput {
  id: number;
  deviceUuid: string;
  sessionUuid: string;
  projectId: number;
  clientIp: string | null;
  dataType: DataType;
  key: string;
  value: string;
  clientTimestamp: number | null;
  createdAt: string; // ISO 8601 format
}

/**
 * Filters for querying logs
 */
export interface LogFilters {
  deviceUuid?: string;
  sessionUuid?: string;
  projectId?: number;
  dataType?: DataType;
  startTime?: Date;
  endTime?: Date;
}

/**
 * Pagination parameters
 */
export interface Pagination {
  page: number; // Starting from 1
  pageSize: number;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Device statistics report
 */
export interface DeviceReport {
  deviceUuid: string;
  totalLogs: number;
  recordCount: number;
  warningCount: number;
  errorCount: number;
  firstLogTime: string;
  lastLogTime: string;
}

/**
 * Time range statistics report
 */
export interface TimeRangeReport {
  startTime: string;
  endTime: string;
  totalLogs: number;
  recordCount: number;
  warningCount: number;
  errorCount: number;
  deviceCount: number;
}

/**
 * Error statistics report
 */
export interface ErrorReport {
  errors: Array<{
    deviceUuid: string;
    key: string;
    count: number;
    lastOccurrence: string;
  }>;
  totalErrors: number;
}

/**
 * Project organization report - matrix format
 * Rows: session UUIDs, Columns: keys, Values: values
 */
export interface ProjectOrganizationReport {
  projectId: number;
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
  // 保持向后兼容
  date?: string; // 兼容旧版本，等于startDate
  devices: string[]; // Array of session UUIDs (rows) - keeping 'devices' name for compatibility
  keys: string[]; // Array of keys (columns)
  matrix: Record<string, Record<string, string | null>>; // sessionUuid -> key -> value
  sessionInfo: Record<string, { index: number; startTime: string; uuid: string }>; // Session timing and index info
  totalDevices: number; // Actually total sessions - keeping name for compatibility
  totalKeys: number;
  totalEntries: number;
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Custom error classes
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public code: string = "VALIDATION_ERROR",
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(
    message: string,
    public code: string = "NOT_FOUND",
  ) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string = "DATABASE_ERROR",
    public originalError?: Error,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}
