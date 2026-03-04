-- Migration: Fix user_name column (repair for failed 009 migration)
-- If 009 was recorded but user_name column doesn't exist, add it now

SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_name = 'logs' AND table_schema = DATABASE() AND column_name = 'user_name'
);

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE logs ADD COLUMN user_name VARCHAR(100) NULL AFTER project_id',
  'SELECT "Column user_name already exists, no fix needed"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
