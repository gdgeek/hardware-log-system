-- Migration: Change log_value column from JSON to TEXT
-- This migration converts the log_value column from JSON type to TEXT type

ALTER TABLE logs MODIFY COLUMN log_value TEXT NOT NULL;
