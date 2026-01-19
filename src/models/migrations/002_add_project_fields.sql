-- Migration: Add project name and version fields
-- Version: 002
-- Description: Adds project_name and project_version columns to logs table

-- Add project_name column
ALTER TABLE logs 
ADD COLUMN project_name VARCHAR(100) DEFAULT NULL COMMENT 'Project name that generated the log'
AFTER device_uuid;

-- Add project_version column
ALTER TABLE logs 
ADD COLUMN project_version VARCHAR(50) DEFAULT NULL COMMENT 'Project version that generated the log'
AFTER project_name;

-- Add index for project queries
CREATE INDEX idx_project ON logs (project_name, project_version);
