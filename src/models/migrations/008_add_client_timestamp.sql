-- Migration: Add client_timestamp column
-- This migration adds the client_timestamp column to the logs table

-- Add client_timestamp column if it doesn't exist
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_name = 'logs' AND table_schema = DATABASE() AND column_name = 'client_timestamp';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE logs ADD COLUMN client_timestamp BIGINT NULL AFTER log_value', 
  'SELECT "Column client_timestamp already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;