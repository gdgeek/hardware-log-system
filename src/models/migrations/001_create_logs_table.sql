-- Migration: Create logs table
-- Version: 001
-- Description: Creates the logs table with all required fields and indexes
-- Requirements: 5.1, 5.3, 9.3

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key, auto-incrementing log ID',
  device_uuid VARCHAR(36) NOT NULL COMMENT 'UUID of the device that generated the log',
  data_type ENUM('record', 'warning', 'error') NOT NULL COMMENT 'Type of log entry: record, warning, or error',
  log_key VARCHAR(255) NOT NULL COMMENT 'Key identifier for the log entry',
  log_value JSON NOT NULL COMMENT 'JSON value containing log data',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when the log was created',
  
  -- Indexes for query optimization
  INDEX idx_device_uuid (device_uuid) COMMENT 'Index for querying logs by device UUID',
  INDEX idx_data_type (data_type) COMMENT 'Index for querying logs by data type',
  INDEX idx_created_at (created_at) COMMENT 'Index for querying logs by creation time',
  INDEX idx_device_type (device_uuid, data_type) COMMENT 'Composite index for querying logs by device and type',
  INDEX idx_device_time (device_uuid, created_at) COMMENT 'Composite index for querying logs by device and time'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Table storing hardware device logs';
