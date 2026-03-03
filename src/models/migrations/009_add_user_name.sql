-- Migration: Add user_name column
-- This migration adds the user_name column to the logs table

SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_name = 'logs' AND table_schema = DATABASE() AND column_name = 'user_name'
);

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE logs ADD COLUMN user_name VARCHAR(100) NULL AFTER project_id',
  'SELECT "Column user_name already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
