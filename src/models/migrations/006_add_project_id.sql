-- Migration: Add project_id column
-- This migration adds the project_id column to the logs table

-- Check if column exists and add if not
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_name = 'logs' AND table_schema = DATABASE() AND column_name = 'project_id';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE logs ADD COLUMN project_id INT NOT NULL DEFAULT 0 AFTER session_uuid', 
  'SELECT "Column project_id already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if index exists and add if not
SELECT COUNT(*) INTO @idx_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE table_name = 'logs' AND table_schema = DATABASE() AND index_name = 'idx_project_id';

SET @sql = IF(@idx_exists = 0, 
  'ALTER TABLE logs ADD INDEX idx_project_id (project_id)', 
  'SELECT "Index idx_project_id already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
