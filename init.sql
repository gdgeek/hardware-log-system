-- Hardware Log System - Database Initialization Script

CREATE DATABASE IF NOT EXISTS hardware_logs 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE hardware_logs;

-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key',
  device_uuid VARCHAR(36) NOT NULL COMMENT 'Device UUID',
  session_uuid VARCHAR(36) NOT NULL COMMENT 'Session UUID for tracking app runs',
  client_ip VARCHAR(45) NULL COMMENT 'Client IP address (IPv4/IPv6)',
  data_type ENUM('record', 'warning', 'error') NOT NULL COMMENT 'Log type',
  log_key VARCHAR(255) NOT NULL COMMENT 'Log key identifier',
  log_value TEXT NOT NULL COMMENT 'Log data as string',
  client_timestamp BIGINT NULL COMMENT 'Client-side timestamp',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Server timestamp',
  
  INDEX idx_device_uuid (device_uuid),
  INDEX idx_session_uuid (session_uuid),
  INDEX idx_data_type (data_type),
  INDEX idx_created_at (created_at),
  INDEX idx_client_ip (client_ip),
  INDEX idx_device_type (device_uuid, data_type),
  INDEX idx_device_time (device_uuid, created_at),
  INDEX idx_device_session (device_uuid, session_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hardware device logs';
