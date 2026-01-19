/**
 * Validation schemas using Joi
 * 
 * This module defines validation schemas for:
 * - LogInput: Validates log creation requests
 * - Query parameters: Validates filters and pagination
 * 
 * Requirements: 1.3, 1.4, 1.5
 */

import Joi from 'joi';

/**
 * UUID v4 format validation pattern
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Data type enum values
 */
const DATA_TYPES = ['record', 'warning', 'error'] as const;

/**
 * Schema for validating LogInput
 * 
 * Validates:
 * - deviceUuid: Must be a valid UUID v4 format (Requirement 1.3)
 * - projectName: Optional string, max length 100 characters
 * - projectVersion: Optional string, max length 50 characters
 * - dataType: Must be one of 'record', 'warning', 'error' (Requirement 1.5)
 * - key: Required string, max length 255 characters (Requirement 1.3)
 * - value: Must be a valid object/JSON (Requirement 1.4)
 */
export const logInputSchema = Joi.object({
  deviceUuid: Joi.string()
    .pattern(UUID_PATTERN)
    .required()
    .messages({
      'string.pattern.base': 'deviceUuid must be a valid UUID v4 format',
      'any.required': 'deviceUuid is required',
      'string.empty': 'deviceUuid cannot be empty'
    }),
  
  projectName: Joi.string()
    .max(100)
    .allow(null, '')
    .optional()
    .messages({
      'string.max': 'projectName must not exceed 100 characters'
    }),
  
  projectVersion: Joi.string()
    .max(50)
    .allow(null, '')
    .optional()
    .messages({
      'string.max': 'projectVersion must not exceed 50 characters'
    }),
  
  dataType: Joi.string()
    .valid(...DATA_TYPES)
    .required()
    .messages({
      'any.only': 'dataType must be one of: record, warning, error',
      'any.required': 'dataType is required',
      'string.empty': 'dataType cannot be empty'
    }),
  
  key: Joi.string()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.min': 'key must be at least 1 character long',
      'string.max': 'key must not exceed 255 characters',
      'any.required': 'key is required',
      'string.empty': 'key cannot be empty'
    }),
  
  value: Joi.object()
    .required()
    .messages({
      'object.base': 'value must be a valid JSON object',
      'any.required': 'value is required'
    })
}).options({ stripUnknown: true });

/**
 * Schema for validating log query filters
 * 
 * Validates:
 * - deviceUuid: Optional UUID v4 format
 * - projectName: Optional string
 * - projectVersion: Optional string
 * - dataType: Optional, must be one of the valid data types
 * - startTime: Optional ISO 8601 date string
 * - endTime: Optional ISO 8601 date string
 */
export const logFiltersSchema = Joi.object({
  deviceUuid: Joi.string()
    .pattern(UUID_PATTERN)
    .optional()
    .messages({
      'string.pattern.base': 'deviceUuid must be a valid UUID v4 format'
    }),
  
  projectName: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'projectName must not exceed 100 characters'
    }),
  
  projectVersion: Joi.string()
    .max(50)
    .optional()
    .messages({
      'string.max': 'projectVersion must not exceed 50 characters'
    }),
  
  dataType: Joi.string()
    .valid(...DATA_TYPES)
    .optional()
    .messages({
      'any.only': 'dataType must be one of: record, warning, error'
    }),
  
  startTime: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'startTime must be a valid ISO 8601 date string'
    }),
  
  endTime: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'endTime must be a valid ISO 8601 date string'
    })
}).options({ stripUnknown: true });

/**
 * Schema for validating pagination parameters
 * 
 * Validates:
 * - page: Must be a positive integer, defaults to 1
 * - pageSize: Must be between 1 and 100, defaults to 20
 */
export const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'page must be a number',
      'number.integer': 'page must be an integer',
      'number.min': 'page must be at least 1'
    }),
  
  pageSize: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'pageSize must be a number',
      'number.integer': 'pageSize must be an integer',
      'number.min': 'pageSize must be at least 1',
      'number.max': 'pageSize must not exceed 100'
    })
}).options({ stripUnknown: true });

/**
 * Schema for validating device UUID parameter
 */
export const deviceUuidParamSchema = Joi.object({
  uuid: Joi.string()
    .pattern(UUID_PATTERN)
    .required()
    .messages({
      'string.pattern.base': 'uuid must be a valid UUID v4 format',
      'any.required': 'uuid is required'
    })
});

/**
 * Schema for validating time range query parameters
 */
export const timeRangeQuerySchema = Joi.object({
  startTime: Joi.date()
    .iso()
    .required()
    .messages({
      'date.format': 'startTime must be a valid ISO 8601 date string',
      'any.required': 'startTime is required'
    }),
  
  endTime: Joi.date()
    .iso()
    .required()
    .messages({
      'date.format': 'endTime must be a valid ISO 8601 date string',
      'any.required': 'endTime is required'
    })
}).custom((value, helpers) => {
  // Validate that endTime is after startTime
  if (value.endTime <= value.startTime) {
    return helpers.error('any.invalid', {
      message: 'endTime must be after startTime'
    });
  }
  return value;
});

/**
 * Schema for validating log ID parameter
 */
export const logIdParamSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'id must be a number',
      'number.integer': 'id must be an integer',
      'number.positive': 'id must be a positive number',
      'any.required': 'id is required'
    })
});
