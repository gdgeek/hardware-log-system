-- Migration: Change value column from JSON to TEXT
-- This migration converts the value column from JSON type to TEXT type

ALTER TABLE logs MODIFY COLUMN value TEXT NOT NULL;
