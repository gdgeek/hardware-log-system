/**
 * Property-based tests for input validation
 *
 * Property 3: Input validation rejects invalid data
 *
 * For any invalid log input (missing required fields, value not valid JSON,
 * or dataType not in allowed enum values), validation should reject the request
 * and return descriptive error information.
 *
 * **Validates: Requirements 1.3, 1.4, 1.5**
 *
 * Requirements:
 * - 1.3: Missing required fields (UUID, dataType, key, value) should be rejected
 * - 1.4: Invalid JSON format for value field should be rejected
 * - 1.5: Invalid dataType (not record/warning/error) should be rejected
 */

import * as fc from "fast-check";
import { validate } from "./validator";
import { logInputSchema } from "./schemas";
import { ValidationError } from "../types";

// Helper function to extract error fields
function getErrorFields(error: ValidationError | undefined): string[] {
  if (!error?.details?.errors) return [];
  const errors = error.details.errors as Array<{
    field: string;
    message: string;
  }>;
  return errors.map((e) => e.field);
}

// Helper: Generate valid UUID v4
const validUuidV4 = fc
  .uuid()
  .filter((uuid) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      uuid,
    ),
  );

const validProjectId = fc.integer({ min: 1, max: 1000000 });
const validTimestamp = fc.integer({ min: 1704067200000, max: 1735660800000 });
const validSignature = fc.string({ minLength: 10, maxLength: 50 });

describe("Property-Based Tests: Input Validation", () => {
  describe("Property 3: Input validation rejects invalid data", () => {
    // Test 1: Missing required fields should be rejected (Requirement 1.3)
    it("should reject log input with missing deviceUuid", () => {
      fc.assert(
        fc.property(
          fc.record({
            sessionUuid: validUuidV4,
            projectId: validProjectId,
            timestamp: validTimestamp,
            signature: validSignature,
            dataType: fc.constantFrom("record", "warning", "error"),
            key: fc
              .string({ minLength: 1, maxLength: 255 })
              .filter((s) => s.trim().length > 0),
            value: fc.dictionary(fc.string({ minLength: 1 }), fc.anything(), {
              minKeys: 1,
            }),
          }),
          (invalidInput) => {
            const result = validate(logInputSchema, invalidInput);

            // Should have validation error
            expect(result.error).toBeInstanceOf(ValidationError);
            expect(result.error?.code).toBe("VALIDATION_ERROR");
            expect(result.value).toBeUndefined();

            // Should mention deviceUuid in error details
            const errorFields = getErrorFields(result.error);
            expect(errorFields).toContain("deviceUuid");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject log input with missing dataType", () => {
      fc.assert(
        fc.property(
          fc.record({
            deviceUuid: validUuidV4,
            sessionUuid: validUuidV4,
            projectId: validProjectId,
            timestamp: validTimestamp,
            signature: validSignature,
            key: fc
              .string({ minLength: 1, maxLength: 255 })
              .filter((s) => s.trim().length > 0),
            value: fc.dictionary(fc.string({ minLength: 1 }), fc.anything(), {
              minKeys: 1,
            }),
          }),
          (invalidInput) => {
            const result = validate(logInputSchema, invalidInput);

            // Should have validation error
            expect(result.error).toBeInstanceOf(ValidationError);
            expect(result.error?.code).toBe("VALIDATION_ERROR");
            expect(result.value).toBeUndefined();

            // Should mention dataType in error details
            const errorFields = getErrorFields(result.error);
            expect(errorFields).toContain("dataType");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject log input with missing key", () => {
      fc.assert(
        fc.property(
          fc.record({
            deviceUuid: validUuidV4,
            sessionUuid: validUuidV4,
            projectId: validProjectId,
            timestamp: validTimestamp,
            signature: validSignature,
            dataType: fc.constantFrom("record", "warning", "error"),
            value: fc.dictionary(fc.string({ minLength: 1 }), fc.anything(), {
              minKeys: 1,
            }),
          }),
          (invalidInput) => {
            const result = validate(logInputSchema, invalidInput);

            // Should have validation error
            expect(result.error).toBeInstanceOf(ValidationError);
            expect(result.error?.code).toBe("VALIDATION_ERROR");
            expect(result.value).toBeUndefined();

            // Should mention key in error details
            const errorFields = getErrorFields(result.error);
            expect(errorFields).toContain("key");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject log input with missing value", () => {
      fc.assert(
        fc.property(
          fc.record({
            deviceUuid: validUuidV4,
            sessionUuid: validUuidV4,
            projectId: validProjectId,
            timestamp: validTimestamp,
            signature: validSignature,
            dataType: fc.constantFrom("record", "warning", "error"),
            key: fc
              .string({ minLength: 1, maxLength: 255 })
              .filter((s) => s.trim().length > 0),
          }),
          (invalidInput) => {
            const result = validate(logInputSchema, invalidInput);

            // Should have validation error
            expect(result.error).toBeInstanceOf(ValidationError);
            expect(result.error?.code).toBe("VALIDATION_ERROR");
            expect(result.value).toBeUndefined();

            // Should mention value in error details
            const errorFields = getErrorFields(result.error);
            expect(errorFields).toContain("value");
          },
        ),
        { numRuns: 100 },
      );
    });

    // Test 2: Invalid UUID format should be rejected (Requirement 1.3)
    it("should reject log input with invalid UUID format", () => {
      // Generator for invalid UUIDs
      const invalidUuidGen = fc.oneof(
        fc
          .string()
          .filter(
            (s) =>
              !s.match(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
              ),
          ),
        fc.constant("not-a-uuid"),
        fc.constant("12345678-1234-1234-1234-123456789012"), // Not v4
        fc.constant("550e8400-e29b-31d4-a716-446655440000"), // v3, not v4
        fc.constant("550e8400e29b41d4a716446655440000"), // Missing hyphens
        fc.constant(""),
        fc.hexaString({ minLength: 32, maxLength: 32 }), // Just hex, no structure
      );

      fc.assert(
        fc.property(
          fc.record({
            deviceUuid: invalidUuidGen,
            sessionUuid: validUuidV4,
            projectId: validProjectId,
            timestamp: validTimestamp,
            signature: validSignature,
            dataType: fc.constantFrom("record", "warning", "error"),
            key: fc
              .string({ minLength: 1, maxLength: 255 })
              .filter((s) => s.trim().length > 0),
            value: fc.dictionary(fc.string({ minLength: 1 }), fc.anything(), {
              minKeys: 1,
            }),
          }),
          (invalidInput) => {
            const result = validate(logInputSchema, invalidInput);

            // Should have validation error
            expect(result.error).toBeInstanceOf(ValidationError);
            expect(result.error?.code).toBe("VALIDATION_ERROR");
            expect(result.value).toBeUndefined();

            // Should mention deviceUuid in error details
            const errorFields = getErrorFields(result.error);
            expect(errorFields).toContain("deviceUuid");
          },
        ),
        { numRuns: 100 },
      );
    });

    // Test 3: Invalid dataType should be rejected (Requirement 1.5)
    it("should reject log input with invalid dataType", () => {
      // Generator for invalid data types
      const invalidDataTypeGen = fc.oneof(
        fc.string().filter((s) => !["record", "warning", "error"].includes(s)),
        fc.constant("info"),
        fc.constant("debug"),
        fc.constant("RECORD"), // Case sensitive
        fc.constant("Warning"),
        fc.constant("ERROR"),
        fc.constant(""),
        fc.constant("log"),
        fc.constant("critical"),
      );

      fc.assert(
        fc.property(
          fc.record({
            deviceUuid: validUuidV4,
            sessionUuid: validUuidV4,
            projectId: validProjectId,
            timestamp: validTimestamp,
            signature: validSignature,
            dataType: invalidDataTypeGen,
            key: fc
              .string({ minLength: 1, maxLength: 255 })
              .filter((s) => s.trim().length > 0),
            value: fc.dictionary(fc.string({ minLength: 1 }), fc.anything(), {
              minKeys: 1,
            }),
          }),
          (invalidInput) => {
            const result = validate(logInputSchema, invalidInput);

            // Should have validation error
            expect(result.error).toBeInstanceOf(ValidationError);
            expect(result.error?.code).toBe("VALIDATION_ERROR");
            expect(result.value).toBeUndefined();

            // Should mention dataType in error details
            const errorFields = getErrorFields(result.error);
            expect(errorFields).toContain("dataType");
          },
        ),
        { numRuns: 100 },
      );
    });

    // Test 4: Invalid value (non-object types) should be rejected (Requirement 1.4)
    it("should reject log input with non-object value", () => {
      // Generator for non-object values
      const nonObjectGen = fc.oneof(
        fc.string(),
        fc.integer(),
        fc.boolean(),
        fc.constant(null),
        fc.array(fc.anything()), // Arrays are not objects in Joi
        fc.constant(undefined),
      );

      fc.assert(
        fc.property(
          fc.record({
            deviceUuid: validUuidV4,
            sessionUuid: validUuidV4,
            projectId: validProjectId,
            timestamp: validTimestamp,
            signature: validSignature,
            dataType: fc.constantFrom("record", "warning", "error"),
            key: fc
              .string({ minLength: 1, maxLength: 255 })
              .filter((s) => s.trim().length > 0),
            value: nonObjectGen,
          }),
          (invalidInput) => {
            const result = validate(logInputSchema, invalidInput);

            // Should have validation error
            expect(result.error).toBeInstanceOf(ValidationError);
            expect(result.error?.code).toBe("VALIDATION_ERROR");
            expect(result.value).toBeUndefined();

            // Should mention value in error details
            const errorFields = getErrorFields(result.error);
            expect(errorFields).toContain("value");
          },
        ),
        { numRuns: 100 },
      );
    });

    // Test 5: Invalid key (empty or too long) should be rejected (Requirement 1.3)
    it("should reject log input with empty key", () => {
      fc.assert(
        fc.property(
          fc.record({
            deviceUuid: validUuidV4,
            sessionUuid: validUuidV4,
            projectId: validProjectId,
            timestamp: validTimestamp,
            signature: validSignature,
            dataType: fc.constantFrom("record", "warning", "error"),
            key: fc.constant(""),
            value: fc.dictionary(fc.string({ minLength: 1 }), fc.anything(), {
              minKeys: 1,
            }),
          }),
          (invalidInput) => {
            const result = validate(logInputSchema, invalidInput);

            // Should have validation error
            expect(result.error).toBeInstanceOf(ValidationError);
            expect(result.error?.code).toBe("VALIDATION_ERROR");
            expect(result.value).toBeUndefined();

            // Should mention key in error details
            const errorFields = getErrorFields(result.error);
            expect(errorFields).toContain("key");
          },
        ),
        { numRuns: 50 },
      );
    });

    it("should reject log input with key exceeding 255 characters", () => {
      fc.assert(
        fc.property(
          fc.record({
            deviceUuid: validUuidV4,
            sessionUuid: validUuidV4,
            projectId: validProjectId,
            timestamp: validTimestamp,
            signature: validSignature,
            dataType: fc.constantFrom("record", "warning", "error"),
            key: fc.string({ minLength: 256, maxLength: 500 }),
            value: fc.dictionary(fc.string({ minLength: 1 }), fc.anything(), {
              minKeys: 1,
            }),
          }),
          (invalidInput) => {
            const result = validate(logInputSchema, invalidInput);

            // Should have validation error
            expect(result.error).toBeInstanceOf(ValidationError);
            expect(result.error?.code).toBe("VALIDATION_ERROR");
            expect(result.value).toBeUndefined();

            // Should mention key in error details
            const errorFields = getErrorFields(result.error);
            expect(errorFields).toContain("key");
          },
        ),
        { numRuns: 50 },
      );
    });

    // Test 6: Multiple validation errors should all be reported
    it("should report all validation errors when multiple fields are invalid", () => {
      // Generator for completely invalid input
      const invalidInputGen = fc.record({
        deviceUuid: fc.constant("not-a-uuid"),
        sessionUuid: fc.constant("not-a-uuid"),
        projectId: fc.constant("not-a-number" as any),
        timestamp: fc.constant("not-a-number" as any),
        signature: fc.constant(""),
        dataType: fc.constant("invalid-type"),
        key: fc.constant(""),
        value: fc.string(), // Should be object
      });

      fc.assert(
        fc.property(invalidInputGen, (invalidInput) => {
          const result = validate(logInputSchema, invalidInput);

          // Should have validation error
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error?.code).toBe("VALIDATION_ERROR");
          expect(result.value).toBeUndefined();

          // Should have multiple errors (at least 3: deviceUuid, dataType, key, value)
          const errorCount = result.error?.details?.errors
            ? (result.error.details.errors as any[]).length
            : 0;
          expect(errorCount).toBeGreaterThanOrEqual(3);

          // Should include all invalid fields
          const errorFields = getErrorFields(result.error);
          expect(errorFields).toContain("deviceUuid");
          expect(errorFields).toContain("dataType");
          // Either key or value should be in errors (or both)
          expect(
            errorFields.includes("key") || errorFields.includes("value"),
          ).toBe(true);
        }),
        { numRuns: 50 },
      );
    });

    // Test 7: Valid input should NOT be rejected (sanity check)
    it("should accept valid log input", () => {
      fc.assert(
        fc.property(
          fc.record({
            deviceUuid: validUuidV4,
            sessionUuid: validUuidV4,
            projectId: validProjectId,
            timestamp: validTimestamp,
            signature: validSignature,
            dataType: fc.constantFrom("record", "warning", "error"),
            key: fc
              .string({ minLength: 1, maxLength: 255 })
              .filter((s) => s.trim().length > 0),
            value: fc.dictionary(fc.string({ minLength: 1 }), fc.anything(), {
              minKeys: 1,
            }),
          }),
          (validInput) => {
            const result = validate(logInputSchema, validInput);

            // Should NOT have validation error
            expect(result.error).toBeUndefined();
            expect(result.value).toBeDefined();

            // Should return the validated value
            if (result.value) {
              const value = result.value as any;
              expect(value.deviceUuid).toBe(validInput.deviceUuid);
              expect(value.sessionUuid).toBe(validInput.sessionUuid);
              expect(value.projectId).toBe(validInput.projectId);
              expect(value.dataType).toBe(validInput.dataType);
              expect(value.key).toBe(validInput.key);
              expect(value.value).toEqual(validInput.value);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
