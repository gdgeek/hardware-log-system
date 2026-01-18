# Validation Module

This module provides input validation functionality for the hardware log system using Joi schemas.

## Overview

The validation module validates:
- **Log input data**: UUID format, dataType enum, key length, value JSON format
- **Query parameters**: Filters and pagination parameters
- **Route parameters**: Device UUIDs, log IDs, time ranges

## Requirements

This module implements requirements:
- **1.3**: Reject requests with missing required fields (UUID, dataType, key, value)
- **1.4**: Reject requests with invalid JSON value format
- **1.5**: Reject requests with invalid dataType (not record, warning, or error)

## Files

- `schemas.ts`: Joi validation schemas for all input types
- `validator.ts`: Utility functions for validation
- `index.ts`: Module exports
- `schemas.test.ts`: Unit tests for schemas
- `validator.test.ts`: Unit tests for validator utilities

## Usage

### Validating Log Input

```typescript
import { logInputSchema, validateOrThrow } from './validation';

// Validate log input
const logData = {
  deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
  dataType: 'record',
  key: 'temperature',
  value: { temp: 25.5, unit: 'celsius' }
};

try {
  const validated = validateOrThrow(logInputSchema, logData);
  // Use validated data
} catch (error) {
  // Handle validation error
  console.error(error.details);
}
```

### Validating Query Parameters

```typescript
import { logFiltersSchema, paginationSchema, validate } from './validation';

// Validate filters
const filters = {
  deviceUuid: '550e8400-e29b-41d4-a716-446655440000',
  dataType: 'error',
  startTime: '2024-01-01T00:00:00.000Z',
  endTime: '2024-01-31T23:59:59.999Z'
};

const filterResult = validate(logFiltersSchema, filters);
if (filterResult.error) {
  // Handle error
} else {
  // Use filterResult.value
}

// Validate pagination
const pagination = { page: 1, pageSize: 20 };
const paginationResult = validate(paginationSchema, pagination);
```

### Using Utility Functions

```typescript
import { isValidUuid, isValidDataType, isValidJson } from './validation';

// Check UUID format
if (isValidUuid('550e8400-e29b-41d4-a716-446655440000')) {
  // Valid UUID v4
}

// Check data type
if (isValidDataType('record')) {
  // Valid data type
}

// Check JSON object
if (isValidJson({ key: 'value' })) {
  // Valid JSON object
}
```

## Validation Schemas

### logInputSchema

Validates log creation requests:
- `deviceUuid`: Required, must be valid UUID v4 format
- `dataType`: Required, must be 'record', 'warning', or 'error'
- `key`: Required, 1-255 characters
- `value`: Required, must be a valid JSON object

### logFiltersSchema

Validates log query filters:
- `deviceUuid`: Optional, must be valid UUID v4 format
- `dataType`: Optional, must be 'record', 'warning', or 'error'
- `startTime`: Optional, must be valid ISO 8601 date
- `endTime`: Optional, must be valid ISO 8601 date

### paginationSchema

Validates pagination parameters:
- `page`: Integer >= 1, defaults to 1
- `pageSize`: Integer 1-100, defaults to 20

### deviceUuidParamSchema

Validates device UUID route parameter:
- `uuid`: Required, must be valid UUID v4 format

### timeRangeQuerySchema

Validates time range query parameters:
- `startTime`: Required, must be valid ISO 8601 date
- `endTime`: Required, must be valid ISO 8601 date, must be after startTime

### logIdParamSchema

Validates log ID route parameter:
- `id`: Required, must be positive integer

## Error Handling

Validation errors are returned as `ValidationError` objects with:
- `code`: Error code (e.g., 'VALIDATION_ERROR')
- `message`: Human-readable error message
- `details`: Object containing array of field-specific errors

Example error structure:
```typescript
{
  code: 'VALIDATION_ERROR',
  message: 'Validation failed',
  details: {
    errors: [
      {
        field: 'deviceUuid',
        message: 'deviceUuid must be a valid UUID v4 format',
        type: 'string.pattern.base'
      },
      {
        field: 'dataType',
        message: 'dataType must be one of: record, warning, error',
        type: 'any.only'
      }
    ]
  }
}
```

## Testing

Run validation tests:
```bash
npm test -- src/validation
```

The test suite includes:
- Valid input tests for all schemas
- Invalid input tests for each field
- Edge case tests (boundary values, empty strings, etc.)
- Multiple error collection tests
- Type conversion tests
- Utility function tests

## Integration

This module is used by:
- **ValidationMiddleware**: Express middleware for request validation
- **LogService**: Business logic layer for input validation
- **API Routes**: Route handlers for parameter validation
