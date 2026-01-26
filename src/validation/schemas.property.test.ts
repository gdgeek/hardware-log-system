/**
 * Property-based tests for input validation
 */

import * as fc from "fast-check";
import { validate } from "./validator";
import { logInputSchema } from "./schemas";
import { ValidationError } from "../types";

// Helper function to extract error fields
function getErrorFields(error: ValidationError | undefined): string[] {
  if (!error?.details?.errors) return [];
  const errors = error.details.errors as Array<{ field: string; message: string }>;
  return errors.map((e) => e.field);
}

// Helper: Generate valid UUID v4
const validUuidV4 = fc
  .uuid()
  .filter((uuid) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid),
  );

const validTimestamp = fc.integer({ min: 1704067200000, max: 1735660800000 });

describe("Property-Based Tests: Input Validation", () => {
  describe("Property 3: Input validation rejects invalid data", () => {
    it("should reject log input with missing deviceUuid", () => {
      fc.assert(
        fc.property(
          fc.record({
            sessionUuid: validUuidV4,
            timestamp: validTimestamp,
            dataType: fc.constantFrom("record", "warning", "error"),
            key: fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
            value: fc.dictionary(fc.string({ minLength: 1 }), fc.anything(), { minKeys: 1 }),
          }),
          (invalidInput) => {
            const result = validate(logInputSchema, invalidInput);
            expect(result.error).toBeInstanceOf(ValidationError);
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
            timestamp: validTimestamp,
            key: fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
            value: fc.dictionary(fc.string({ minLength: 1 }), fc.anything(), { minKeys: 1 }),
          }),
          (invalidInput) => {
            const result = validate(logInputSchema, invalidInput);
            expect(result.error).toBeInstanceOf(ValidationError);
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
            timestamp: validTimestamp,
            dataType: fc.constantFrom("record", "warning", "error"),
            value: fc.dictionary(fc.string({ minLength: 1 }), fc.anything(), { minKeys: 1 }),
          }),
          (invalidInput) => {
            const result = validate(logInputSchema, invalidInput);
            expect(result.error).toBeInstanceOf(ValidationError);
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
            timestamp: validTimestamp,
            dataType: fc.constantFrom("record", "warning", "error"),
            key: fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
          }),
          (invalidInput) => {
            const result = validate(logInputSchema, invalidInput);
            expect(result.error).toBeInstanceOf(ValidationError);
            const errorFields = getErrorFields(result.error);
            expect(errorFields).toContain("value");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject log input with invalid UUID format", () => {
      const invalidUuidGen = fc.oneof(
        fc.constant("not-a-uuid"),
        fc.constant("12345678-1234-1234-1234-123456789012"),
        fc.constant(""),
      );

      fc.assert(
        fc.property(
          fc.record({
            deviceUuid: invalidUuidGen,
            sessionUuid: validUuidV4,
            timestamp: validTimestamp,
            dataType: fc.constantFrom("record", "warning", "error"),
            key: fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
            value: fc.dictionary(fc.string({ minLength: 1 }), fc.anything(), { minKeys: 1 }),
          }),
          (invalidInput) => {
            const result = validate(logInputSchema, invalidInput);
            expect(result.error).toBeInstanceOf(ValidationError);
            const errorFields = getErrorFields(result.error);
            expect(errorFields).toContain("deviceUuid");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject log input with invalid dataType", () => {
      const invalidDataTypeGen = fc.oneof(
        fc.constant("info"),
        fc.constant("RECORD"),
        fc.constant(""),
      );

      fc.assert(
        fc.property(
          fc.record({
            deviceUuid: validUuidV4,
            sessionUuid: validUuidV4,
            timestamp: validTimestamp,
            dataType: invalidDataTypeGen,
            key: fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
            value: fc.dictionary(fc.string({ minLength: 1 }), fc.anything(), { minKeys: 1 }),
          }),
          (invalidInput) => {
            const result = validate(logInputSchema, invalidInput);
            expect(result.error).toBeInstanceOf(ValidationError);
            const errorFields = getErrorFields(result.error);
            expect(errorFields).toContain("dataType");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should reject log input with non-object value", () => {
      const nonObjectGen = fc.oneof(fc.string(), fc.integer(), fc.boolean());

      fc.assert(
        fc.property(
          fc.record({
            deviceUuid: validUuidV4,
            sessionUuid: validUuidV4,
            timestamp: validTimestamp,
            dataType: fc.constantFrom("record", "warning", "error"),
            key: fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
            value: nonObjectGen,
          }),
          (invalidInput) => {
            const result = validate(logInputSchema, invalidInput);
            expect(result.error).toBeInstanceOf(ValidationError);
            const errorFields = getErrorFields(result.error);
            expect(errorFields).toContain("value");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should accept valid log input", () => {
      fc.assert(
        fc.property(
          fc.record({
            deviceUuid: validUuidV4,
            sessionUuid: validUuidV4,
            timestamp: validTimestamp,
            dataType: fc.constantFrom("record", "warning", "error"),
            key: fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
            value: fc.dictionary(fc.string({ minLength: 1 }), fc.anything(), { minKeys: 1 }),
          }),
          (validInput) => {
            const result = validate(logInputSchema, validInput);
            expect(result.error).toBeUndefined();
            expect(result.value).toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
