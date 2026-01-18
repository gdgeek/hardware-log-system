/**
 * Validation utility functions
 * 
 * This module provides helper functions for validating data using Joi schemas
 * and converting validation errors to a standardized format.
 * 
 * Requirements: 1.3, 1.4, 1.5
 */

import Joi from 'joi';
import { ValidationError } from '../types';

/**
 * Validation result interface
 */
export interface ValidateResult<T> {
  value?: T;
  error?: ValidationError;
}

/**
 * Validates data against a Joi schema
 * 
 * @param schema - Joi schema to validate against
 * @param data - Data to validate
 * @returns Validation result with value or error
 */
export function validate<T>(
  schema: Joi.Schema,
  data: unknown
): ValidateResult<T> {
  const result = schema.validate(data, {
    abortEarly: false, // Collect all errors
    stripUnknown: true, // Remove unknown fields
    convert: true // Convert types when possible
  });

  if (result.error) {
    const validationError = new ValidationError(
      'Validation failed',
      'VALIDATION_ERROR',
      {
        errors: result.error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type
        }))
      }
    );
    
    return { error: validationError };
  }

  return { value: result.value as T };
}

/**
 * Validates data and throws an error if validation fails
 * 
 * @param schema - Joi schema to validate against
 * @param data - Data to validate
 * @returns Validated and sanitized data
 * @throws ValidationError if validation fails
 */
export function validateOrThrow<T>(
  schema: Joi.Schema,
  data: unknown
): T {
  const result = validate<T>(schema, data);
  
  if (result.error) {
    throw result.error;
  }
  
  return result.value!;
}

/**
 * Checks if a value is a valid JSON object
 * 
 * @param value - Value to check
 * @returns True if value is a valid JSON object
 */
export function isValidJson(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  
  try {
    // Try to stringify and parse to ensure it's valid JSON
    JSON.parse(JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a string is a valid UUID v4
 * 
 * @param uuid - String to check
 * @returns True if string is a valid UUID v4
 */
export function isValidUuid(uuid: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid);
}

/**
 * Checks if a value is a valid data type
 * 
 * @param dataType - Value to check
 * @returns True if value is a valid data type
 */
export function isValidDataType(dataType: string): boolean {
  return ['record', 'warning', 'error'].includes(dataType);
}
