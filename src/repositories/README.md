# Repositories - Data Access Layer

This directory contains the data access layer (DAL) for the hardware log system. Repositories encapsulate all database operations and provide a clean interface for the service layer.

## LogRepository

The `LogRepository` class provides methods for interacting with the `logs` table in the database.

### Methods

#### `create(logData: LogCreationAttributes): Promise<Log>`
Creates a new log entry in the database.

**Parameters:**
- `logData`: Object containing deviceUuid, dataType, logKey, and logValue

**Returns:** Promise resolving to the created Log instance

**Throws:** `DatabaseError` if the operation fails

**Example:**
```typescript
const log = await logRepository.create({
  deviceUuid: 'device-123',
  dataType: 'record',
  logKey: 'temperature',
  logValue: { value: 25.5, unit: 'celsius' }
});
```

#### `findById(id: number): Promise<Log | null>`
Finds a log entry by its ID.

**Parameters:**
- `id`: The log ID to search for

**Returns:** Promise resolving to the Log instance or null if not found

**Throws:** `DatabaseError` if the operation fails

**Example:**
```typescript
const log = await logRepository.findById(123);
if (log) {
  console.log('Found log:', log.toJSON());
}
```

#### `findByFilters(filters: LogFilters, pagination: Pagination): Promise<Log[]>`
Finds logs matching the specified filters with pagination.

**Parameters:**
- `filters`: Filter criteria (deviceUuid, dataType, startTime, endTime)
- `pagination`: Pagination parameters (page, pageSize)

**Returns:** Promise resolving to an array of Log instances

**Throws:** `DatabaseError` if the operation fails

**Example:**
```typescript
const logs = await logRepository.findByFilters(
  { deviceUuid: 'device-123', dataType: 'error' },
  { page: 1, pageSize: 20 }
);
```

#### `countByFilters(filters: LogFilters): Promise<number>`
Counts the number of logs matching the specified filters.

**Parameters:**
- `filters`: Filter criteria (deviceUuid, dataType, startTime, endTime)

**Returns:** Promise resolving to the count of matching logs

**Throws:** `DatabaseError` if the operation fails

**Example:**
```typescript
const count = await logRepository.countByFilters({
  deviceUuid: 'device-123',
  dataType: 'error'
});
console.log(`Found ${count} error logs`);
```

#### `aggregateByDevice(uuid: string): Promise<DeviceReport>`
Aggregates log statistics for a specific device.

**Parameters:**
- `uuid`: The device UUID to aggregate for

**Returns:** Promise resolving to device statistics including:
  - totalLogs: Total number of logs
  - recordCount: Number of record logs
  - warningCount: Number of warning logs
  - errorCount: Number of error logs
  - firstLogTime: Timestamp of first log (ISO 8601)
  - lastLogTime: Timestamp of last log (ISO 8601)

**Throws:** `DatabaseError` if the operation fails

**Example:**
```typescript
const report = await logRepository.aggregateByDevice('device-123');
console.log(`Device has ${report.totalLogs} logs, ${report.errorCount} errors`);
```

#### `aggregateByTimeRange(start: Date, end: Date): Promise<TimeRangeReport>`
Aggregates log statistics for a specific time range.

**Parameters:**
- `start`: Start of the time range
- `end`: End of the time range

**Returns:** Promise resolving to time range statistics including:
  - startTime: Start time (ISO 8601)
  - endTime: End time (ISO 8601)
  - totalLogs: Total number of logs
  - recordCount: Number of record logs
  - warningCount: Number of warning logs
  - errorCount: Number of error logs
  - deviceCount: Number of unique devices

**Throws:** `DatabaseError` if the operation fails

**Example:**
```typescript
const start = new Date('2024-01-01');
const end = new Date('2024-01-31');
const report = await logRepository.aggregateByTimeRange(start, end);
console.log(`Found ${report.totalLogs} logs from ${report.deviceCount} devices`);
```

#### `aggregateErrors(): Promise<ErrorReport>`
Aggregates error log statistics across all devices.

**Parameters:** None

**Returns:** Promise resolving to error statistics including:
  - errors: Array of error summaries (deviceUuid, key, count, lastOccurrence)
  - totalErrors: Total number of error logs

**Throws:** `DatabaseError` if the operation fails

**Example:**
```typescript
const report = await logRepository.aggregateErrors();
console.log(`Total errors: ${report.totalErrors}`);
report.errors.forEach(error => {
  console.log(`${error.deviceUuid} - ${error.key}: ${error.count} occurrences`);
});
```

## Usage

The repository is exported as a singleton instance for convenience:

```typescript
import { logRepository } from './repositories';

// Use the singleton instance
const log = await logRepository.create({
  deviceUuid: 'device-123',
  dataType: 'record',
  logKey: 'temperature',
  logValue: { value: 25.5 }
});
```

Or create your own instance:

```typescript
import { LogRepository } from './repositories';

const repository = new LogRepository();
const log = await repository.findById(123);
```

## Error Handling

All repository methods throw `DatabaseError` when database operations fail. The error includes:
- A descriptive message
- An error code (typically 'DATABASE_ERROR')
- The original error (if available)

Example error handling:

```typescript
import { DatabaseError } from '../types';

try {
  const log = await logRepository.create(logData);
} catch (error) {
  if (error instanceof DatabaseError) {
    console.error('Database operation failed:', error.message);
    console.error('Error code:', error.code);
    if (error.originalError) {
      console.error('Original error:', error.originalError);
    }
  }
}
```

## Testing

The repository includes comprehensive unit tests in `LogRepository.test.ts`. Tests cover:
- Normal operations
- Edge cases (empty results, large datasets)
- Error conditions
- Aggregation calculations
- Filter combinations
- Pagination

Run tests with:
```bash
npm test -- src/repositories/LogRepository.test.ts
```

## Performance Considerations

The repository leverages database indexes for optimal query performance:
- `idx_device_uuid`: For device-specific queries
- `idx_data_type`: For type-specific queries
- `idx_created_at`: For time-based queries
- `idx_device_type`: For combined device and type queries
- `idx_device_time`: For combined device and time queries

All queries use Sequelize's parameterized queries to prevent SQL injection.

## Logging

All repository operations are logged using Winston:
- Debug level: Successful operations with details
- Error level: Failed operations with error details

Logs include relevant context such as filters, IDs, and operation results.
