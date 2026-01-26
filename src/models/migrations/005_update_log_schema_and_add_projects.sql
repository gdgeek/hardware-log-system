-- Migration: Update log schema and add projects table
-- Description: Creates projects table, adds project_id to logs, and removes old project fields

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  auth_key VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_auth_key (auth_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add new fields to logs table
ALTER TABLE logs 
  ADD COLUMN project_id INT AFTER session_uuid,
  ADD COLUMN client_timestamp BIGINT AFTER project_id;

-- Create index for project_id
CREATE INDEX idx_project_id ON logs(project_id);

-- Drop old fields and their index
-- Note: We first drop the index then the columns
DROP INDEX idx_project ON logs;
ALTER TABLE logs 
  DROP COLUMN project_name,
  DROP COLUMN project_version;

-- Optional: Add foreign key constraint if you want strict enforcement
-- ALTER TABLE logs ADD CONSTRAINT fk_logs_project FOREIGN KEY (project_id) REFERENCES projects(id);
