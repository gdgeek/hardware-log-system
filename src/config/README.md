# Configuration Module

This directory contains configuration modules for the hardware log system.

## Files

### `env.ts`
Environment variable configuration and validation.

**Features:**
- Loads and validates all required environment variables
- Provides type-safe configuration object
- Validates configuration values (port ranges, pool sizes, etc.)
- Logs configuration on startup (with sensitive data masked)

**Usage:**
```typescript
import { config } from './config/env';

console.log(config.dbHost); // Access database host
console.log(config.port);   // Access server port
```

### `logger.ts`
Winston-based logging configuration.

**Features:**
- Structured JSON logging to files
- Colored console output in development
- Separate error log file
- Log rotation (10MB max, 5 files)
- Helper functions for common logging patterns

**Usage:**
```typescript
import { logger, logError, logRequest } from './config/logger';

logger.info('Application started');
logger.error('Something went wrong', { error: err });

logError('Database error', err, { query: 'SELECT * FROM logs' });
logRequest('GET', '/api/logs', 200, 150);
```

### `database.ts`
Sequelize database connection and pool management.

**Features:**
- MySQL connection with Sequelize ORM
- Connection pool configuration (min: 2, max: 10)
- Connection testing and health checks
- Error handling and logging
- Pool status monitoring

**Usage:**
```typescript
import { sequelize, testConnection, isHealthy, getPoolStatus } from './config/database';

// Test connection on startup
await testConnection();

// Check if database is healthy
const healthy = await isHealthy();

// Get pool statistics
const status = getPoolStatus();
console.log(`Pool: ${status.using}/${status.size} connections in use`);

// Use sequelize for queries
const results = await sequelize.query('SELECT * FROM logs');
```

## Environment Variables

All environment variables are documented in `.env.example`. Required variables:

### Server Configuration
- `NODE_ENV`: Environment (development, production, test)
- `PORT`: Server port (default: 3000)

### Database Configuration
- `DB_HOST`: Database host (required)
- `DB_PORT`: Database port (default: 3306)
- `DB_NAME`: Database name (required)
- `DB_USER`: Database user (required)
- `DB_PASSWORD`: Database password (required)
- `DB_POOL_MIN`: Minimum pool connections (default: 2)
- `DB_POOL_MAX`: Maximum pool connections (default: 10)

### Logging Configuration
- `LOG_LEVEL`: Log level (error, warn, info, debug) (default: info)
- `LOG_FILE`: Log file path (default: logs/app.log)

### API Configuration
- `API_PREFIX`: API path prefix (default: /api)
- `MAX_PAGE_SIZE`: Maximum page size (default: 100)
- `DEFAULT_PAGE_SIZE`: Default page size (default: 20)

## Connection Pool

The database connection pool is configured with the following parameters:

- **min**: Minimum number of connections (configurable via `DB_POOL_MIN`)
- **max**: Maximum number of connections (configurable via `DB_POOL_MAX`)
- **acquire**: Maximum time (30s) to get a connection before throwing error
- **idle**: Maximum time (10s) a connection can be idle before being released

### Pool Monitoring

Use `getPoolStatus()` to monitor pool health:

```typescript
const status = getPoolStatus();
console.log({
  size: status.size,        // Total connections in pool
  available: status.available, // Available connections
  using: status.using,      // Connections in use
  waiting: status.waiting   // Requests waiting for connection
});
```

## Error Handling

All configuration modules implement comprehensive error handling:

1. **Environment validation**: Throws errors on startup if required variables are missing
2. **Database connection**: Logs detailed errors and throws on connection failure
3. **Health checks**: Returns boolean status without throwing
4. **Graceful shutdown**: `closeConnection()` properly closes all connections

## Testing

### Unit Tests
```bash
npm run test:unit -- src/config/database.test.ts
```

Unit tests mock the database connection and test:
- Configuration validation
- Error handling
- Pool status reporting
- Connection lifecycle

### Integration Tests
```bash
npm run test:integration -- src/config/database.integration.ts
```

Integration tests require a running MySQL database and test:
- Real database connections
- Query execution
- Connection pool behavior
- Error recovery

To skip integration tests when database is not available:
```bash
SKIP_DB_TESTS=true npm run test:integration
```

## Best Practices

1. **Always test connection on startup**: Call `testConnection()` before starting the server
2. **Monitor pool health**: Use `getPoolStatus()` to track connection usage
3. **Implement health checks**: Use `isHealthy()` for readiness probes
4. **Graceful shutdown**: Call `closeConnection()` on application shutdown
5. **Log database operations**: Use `logDatabaseOperation()` for tracking

## Example: Application Startup

```typescript
import { config } from './config/env';
import { logger } from './config/logger';
import { testConnection, closeConnection } from './config/database';

async function startServer() {
  try {
    // Test database connection
    await testConnection();
    
    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`Server started on port ${config.port}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close();
      await closeConnection();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();
```
