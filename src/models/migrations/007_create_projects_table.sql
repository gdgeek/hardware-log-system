-- 创建项目表
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NULL,
  column_mapping JSON NULL COMMENT '列名映射配置，格式: {"原列名": "显示名称"}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_uuid (uuid),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认项目数据（如果不存在）
INSERT IGNORE INTO projects (uuid, name, column_mapping) VALUES 
('default-project-1', '默认项目1', '{"temperature": "温度", "humidity": "湿度", "pressure": "压力", "battery": "电池", "cpu_usage": "CPU使用率", "memory_usage": "内存使用率", "disk_error": "磁盘错误", "system_crash": "系统崩溃"}'),
('default-project-2', '默认项目2', '{"temperature": "温度", "humidity": "湿度", "pressure": "压力"}'),
('protected-project-5', '受保护项目5', '{"temperature": "温度", "humidity": "湿度", "pressure": "压力", "battery": "电池"}');

-- 为受保护的项目设置密码（只有在密码为空时才设置）
UPDATE projects SET password = 'project123' WHERE uuid = 'protected-project-5' AND password IS NULL;