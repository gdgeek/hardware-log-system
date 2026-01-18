# Database Models

This directory contains the Sequelize models and database migrations for the hardware log system.

## Models

### Log Model

The `Log` model represents a log entry from a hardware device.

**Fields:**
- `id` (BIGINT): Primary key, auto-incrementing
- `deviceUuid` (VARCHAR(36)): UUID of the device that generated the log
- `dataType` (ENUM): Type of log entry - 'record', 'warning', or 'error'
- `logKey` (VARCHAR(255)): Key identifier for the log entry
- `logValue` (JSON): JSON object containing the log data
- `createdAt` (TIMESTAMP): Timestamp when the log was created (auto-generated)

**Indexes:**
- `idx_device_uuid`: Single index on device_uuid for device-specific queries
- `idx_data_type`: Single index on data_type for type-specific queries
- `idx_created_at`: Single index on created_at for time-based queries
- `idx_device_type`: Composite index on (device_uuid, data_type) for combined queries
- `idx_device_time`: Composite index on (device_uuid, created_at) for device time-series queries

**Validation Rules:**
- `deviceUuid`: Required, non-empty, max 36 characters
- `dataType`: Required, must be one of: 'record', 'warning', 'error'
- `logKey`: Required, non-empty, max 255 characters
- `logValue`: Required, must be a valid JSON object

**Usage Example:**

```typescript
import { Log } from './models';

// Create a new log entry
const log = await Log.create({
  deviceUuid: '123e4567-e89b-12d3-a456-426614174000',
  dataType: 'record',
  logKey: 'temperature',
  logValue: { value: 25.5, unit: 'celsius' },
});

// Query logs by device
const deviceLogs = await Log.findAll({
  where: { deviceUuid: '123e4567-e89b-12d3-a456-426614174000' }
});

// Query logs by type
const errorLogs = await Log.findAll({
  where: { dataType: 'error' }
});
```

## Database Migrations

Database migrations are located in the `migrations/` subdirectory.

### Running Migrations

To apply all pending migrations:

```bash
npm run migrate
```

To rollback migrations (not yet implemented):

```bash
npm run migrate:down
```

### Migration Files

- `001_create_logs_table.sql`: Creates the logs table with all fields and indexes

### Manual Migration

If you prefer to run migrations manually, you can execute the SQL files directly:

```bash
mysql -h <host> -u <user> -p <database> < src/models/migrations/001_create_logs_table.sql
```

### Migration Tracking

The migration system creates a `migrations` table to track which migrations have been applied:

```sql
CREATE TABLE migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

Unit tests for the Log model are in `Log.test.ts`. These tests verify:

- Model definition and field mappings
- Validation rules for all fields
- Automatic timestamp generation
- CRUD operations
- JSON serialization

To run the model tests:

```bash
npm run test:unit -- src/models/Log.test.ts
```

## Requirements Mapping

This implementation satisfies the following requirements:

- **Requirement 5.1**: Uses MySQL database for storing log data
- **Requirement 5.3**: Database table structure includes indexes for query optimization
- **Requirement 9.3**: Indexes on device_uuid, data_type, created_at, and composite indexes

## Performance Considerations

The model includes several indexes to optimize common query patterns:

1. **Device-specific queries**: `idx_device_uuid` allows fast lookup of all logs for a specific device
2. **Type-specific queries**: `idx_data_type` enables efficient filtering by log type
3. **Time-based queries**: `idx_created_at` supports time-range queries
4. **Combined queries**: Composite indexes `idx_device_type` and `idx_device_time` optimize queries that filter by multiple fields

These indexes are designed to support the query patterns defined in the requirements:
- Query logs by device (Requirement 2.1)
- Query logs by data type (Requirement 2.2)
- Query logs by time range (Requirement 2.3)
- Query logs with multiple filters (Requirement 2.4)
