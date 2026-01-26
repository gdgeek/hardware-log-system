-- Migration: Create users table for UI authentication
-- Description: Create users table to store management account info
-- Author: System
-- Date: 2026-01-26

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT 'Username for login',
  password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt password hash',
  role ENUM('admin', 'viewer') DEFAULT 'admin' COMMENT 'User role',
  last_login_at TIMESTAMP NULL COMMENT 'Last successful login time',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert a default admin user (password: admin123)
-- Hash generated via bcrypt (round 10)
INSERT INTO users (username, password_hash, role) 
VALUES ('admin', '$2b$10$BL14xnRUK7ACjgZz7fxfZOK3xMF7ls1.R6LtnIdje6T1VLoItZgI.', 'admin');
