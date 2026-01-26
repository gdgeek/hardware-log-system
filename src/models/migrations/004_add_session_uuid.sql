-- Migration: Add session_uuid field
-- Description: Add session UUID to track app sessions
-- Author: System
-- Date: 2026-01-26

-- Add session_uuid column (optional, can be null)
ALTER TABLE logs ADD COLUMN session_uuid VARCHAR(36) NULL COMMENT 'Session UUID for tracking app runs' AFTER device_uuid;

-- Add index for session queries
CREATE INDEX idx_session_uuid ON logs(session_uuid);

-- Add composite index for device + session queries
CREATE INDEX idx_device_session ON logs(device_uuid, session_uuid);
