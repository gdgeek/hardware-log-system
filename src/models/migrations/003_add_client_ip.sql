-- Migration: Add client_ip field to logs table
-- Description: Stores the IP address of the client that created the log

ALTER TABLE logs
ADD COLUMN client_ip VARCHAR(45) NULL COMMENT 'Client IP address (supports IPv4 and IPv6)' AFTER project_version;

-- Add index for client_ip queries
CREATE INDEX idx_client_ip ON logs(client_ip);
