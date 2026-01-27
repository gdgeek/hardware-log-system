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

// Helper: Generate any non-empty string
const validString = fc.string({ minLength: 1, maxLength: 100 });

const validTimestamp = fc.integer({ min: 1704067200000, max: 1735660800000 });
const validProjectId = fc.integer({ min: 1, max: 10000 });

describe("Property-Based Tests: Input Validation", () => {
  describe("Property 3: Input validation rejects invalid data", () => {
    it("should reject log input with missing deviceUuid", () => {
      fc.assert(
        fc.property(
          fc.record({
            sessionUuid: validString,
            projectId: validProjectId,
            timestamp: validTimestamp,
            dataType: fc.constantFrom("record", "warning", "error"),
            key: fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
            value: fc.string({ minLength: 1 }),
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
            deviceUuid: validString,
            sessionUuid: validString,
            projectId: validProjectId,
            timestamp: validTimestamp,
            key: fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
            value: fc.string({ minLength: 1 }),
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
            deviceUuid: validString,
            sessionUuid: validString,
            projectId: validProjectId,
            timestamp: validTimestamp,
            dataType: fc.constantFrom("record", "warning", "error"),
            value: fc.string({ minLength: 1 }),
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
            deviceUuid: validString,
            sessionUuid: validString,
            projectId: validProjectId,
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

    it("should accept any non-empty string as deviceUuid", () => {
      fc.assert(
        fc.property(
          fc.record({
            deviceUuid: fc.string({ minLength: 1 }),
            sessionUuid: validString,
            projectId: validProjectId,
            timestamp: validTimestamp,
            dataType: fc.constantFrom("record", "warning", "error"),
            key: fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
            value: fc.string({ minLength: 1 }),
          }),
          (validInput) => {
            const result = validate(logInputSchema, validInput);
            expect(result.error).toBeUndefined();
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
            deviceUuid: validString,
            sessionUuid: validString,
            projectId: validProjectId,
            timestamp: validTimestamp,
            dataType: invalidDataTypeGen,
            key: fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
            value: fc.string({ minLength: 1 }),
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

    it("should reject log input with empty value", () => {
      fc.assert(
        fc.property(
          fc.record({
            deviceUuid: validString,
            sessionUuid: validString,
            projectId: validProjectId,
            timestamp: validTimestamp,
            dataType: fc.constantFrom("record", "warning", "error"),
            key: fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
            value: fc.constant(""),
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
            deviceUuid: validString,
            sessionUuid: validString,
            projectId: validProjectId,
            timestamp: validTimestamp,
            dataType: fc.constantFrom("record", "warning", "error"),
            key: fc.string({ minLength: 1, maxLength: 255 }).filter((s) => s.trim().length > 0),
            value: fc.string({ minLength: 1 }),
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
