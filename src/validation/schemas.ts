/**
 * Validation schemas using Joi
 */

import Joi from "joi";

/**
 * UUID v4 format validation pattern
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Data type enum values
 */
const DATA_TYPES = ["record", "warning", "error"] as const;

/**
 * Schema for validating LogInput
 */
export const logInputSchema = Joi.object({
  deviceUuid: Joi.string().required().messages({
    "any.required": "deviceUuid is required",
    "string.empty": "deviceUuid cannot be empty",
  }),

  sessionUuid: Joi.string().required().messages({
    "any.required": "sessionUuid is required",
    "string.empty": "sessionUuid cannot be empty",
  }),

  projectId: Joi.number().integer().required().messages({
    "number.base": "projectId must be a number",
    "number.integer": "projectId must be an integer",
    "any.required": "projectId is required",
  }),

  timestamp: Joi.number().integer().required().messages({
    "number.base": "timestamp must be a number",
    "any.required": "timestamp is required",
  }),

  dataType: Joi.string()
    .valid(...DATA_TYPES)
    .required()
    .messages({
      "any.only": "dataType must be one of: record, warning, error",
      "any.required": "dataType is required",
      "string.empty": "dataType cannot be empty",
    }),

  key: Joi.string().min(1).max(255).required().messages({
    "string.min": "key must be at least 1 character long",
    "string.max": "key must not exceed 255 characters",
    "any.required": "key is required",
    "string.empty": "key cannot be empty",
  }),

  value: Joi.string().required().messages({
    "string.base": "value must be a string",
    "any.required": "value is required",
    "string.empty": "value cannot be empty",
  }),
}).options({ stripUnknown: true });

/**
 * Schema for validating log query filters
 */
export const logFiltersSchema = Joi.object({
  deviceUuid: Joi.string().optional().messages({
    "string.empty": "deviceUuid cannot be empty",
  }),

  sessionUuid: Joi.string().optional().messages({
    "string.empty": "sessionUuid cannot be empty",
  }),

  projectId: Joi.number().integer().optional().messages({
    "number.base": "projectId must be a number",
    "number.integer": "projectId must be an integer",
  }),

  dataType: Joi.string()
    .valid(...DATA_TYPES)
    .optional()
    .messages({
      "any.only": "dataType must be one of: record, warning, error",
    }),

  startTime: Joi.date().iso().optional().messages({
    "date.format": "startTime must be a valid ISO 8601 date string",
  }),

  endTime: Joi.date().iso().optional().messages({
    "date.format": "endTime must be a valid ISO 8601 date string",
  }),
}).options({ stripUnknown: true });

/**
 * Schema for validating pagination parameters
 */
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "page must be a number",
    "number.integer": "page must be an integer",
    "number.min": "page must be at least 1",
  }),

  pageSize: Joi.number().integer().min(1).max(100).default(20).messages({
    "number.base": "pageSize must be a number",
    "number.integer": "pageSize must be an integer",
    "number.min": "pageSize must be at least 1",
    "number.max": "pageSize must not exceed 100",
  }),
}).options({ stripUnknown: true });

/**
 * Schema for validating device UUID parameter
 */
export const deviceUuidParamSchema = Joi.object({
  uuid: Joi.string().pattern(UUID_PATTERN).required().messages({
    "string.pattern.base": "uuid must be a valid UUID v4 format",
    "any.required": "uuid is required",
  }),
});

/**
 * Schema for validating time range query parameters
 */
export const timeRangeQuerySchema = Joi.object({
  startTime: Joi.date().iso().required().messages({
    "date.format": "startTime must be a valid ISO 8601 date string",
    "any.required": "startTime is required",
  }),

  endTime: Joi.date().iso().required().messages({
    "date.format": "endTime must be a valid ISO 8601 date string",
    "any.required": "endTime is required",
  }),
}).custom((value, helpers) => {
  if (value.endTime <= value.startTime) {
    return helpers.error("any.invalid", {
      message: "endTime must be after startTime",
    });
  }
  return value;
});

/**
 * Schema for validating login request
 */
export const loginSchema = Joi.object({
  password: Joi.string().min(1).required().messages({
    "string.min": "password must be at least 1 character long",
    "any.required": "password is required",
    "string.empty": "password cannot be empty",
  }),
}).options({ stripUnknown: true });

/**
 * Schema for validating log ID parameter
 */
export const logIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "id must be a number",
    "number.integer": "id must be an integer",
    "number.positive": "id must be a positive number",
    "any.required": "id is required",
  }),
});

/**
 * Schema for validating project organization report parameters
 */
export const projectOrganizationQuerySchema = Joi.object({
  projectId: Joi.number().integer().positive().required().messages({
    "number.base": "projectId must be a number",
    "number.integer": "projectId must be an integer",
    "number.positive": "projectId must be a positive number",
    "any.required": "projectId is required",
  }),

  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    "string.pattern.base": "date must be in YYYY-MM-DD format",
    "any.required": "date is required",
  }),
}).options({ stripUnknown: true });
