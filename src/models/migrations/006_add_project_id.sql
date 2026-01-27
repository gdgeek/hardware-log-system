-- Migration: Add project_id column
-- This migration adds the project_id column to the logs table

ALTER TABLE logs ADD COLUMN project_id INT NOT NULL DEFAULT 0 AFTER session_uuid;
ALTER TABLE logs ADD INDEX idx_project_id (project_id);
