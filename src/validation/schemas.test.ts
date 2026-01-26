/**
 * Unit tests for validation schemas
 */

import {
  logInputSchema,
  logFiltersSchema,
  paginationSchema,
  deviceUuidParamSchema,
  timeRangeQuerySchema,
  logIdParamSchema,
} from "./schemas";

describe("Validation Schemas", () => {
  describe("logInputSchema", () => {
    describe("valid inputs", () => {
      it("should accept valid log input with all required fields", () => {
        const validInput = {
          deviceUuid: "550e8400-e29b-41d4-a716-446655440000",
          sessionUuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: 1704110400000,
          dataType: "record",
          key: "temperature",
          value: { temp: 25.5, unit: "celsius" },
        };

        const { error, value } = logInputSchema.validate(validInput);
        expect(error).toBeUndefined();
        expect(value).toEqual(validInput);
      });

      it("should accept all valid dataType values", () => {
        const dataTypes = ["record", "warning", "error"];

        dataTypes.forEach((dataType) => {
          const input = {
            deviceUuid: "550e8400-e29b-41d4-a716-446655440000",
            sessionUuid: "550e8400-e29b-41d4-a716-446655440001",
            timestamp: 1704110400000,
            dataType,
            key: "test",
            value: { data: "test" },
          };

          const { error } = logInputSchema.validate(input);
          expect(error).toBeUndefined();
        });
      });

      it("should accept key with maximum length of 255 characters", () => {
        const input = {
          deviceUuid: "550e8400-e29b-41d4-a716-446655440000",
          sessionUuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: 1704110400000,
          dataType: "record",
          key: "a".repeat(255),
          value: { data: "test" },
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeUndefined();
      });

      it("should accept complex nested JSON objects as value", () => {
        const input = {
          deviceUuid: "550e8400-e29b-41d4-a716-446655440000",
          sessionUuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: 1704110400000,
          dataType: "record",
          key: "sensor_data",
          value: {
            temperature: 25.5,
            humidity: 60,
            location: { lat: 40.7128, lng: -74.006 },
            readings: [1, 2, 3, 4, 5],
          },
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeUndefined();
      });

      it("should strip unknown fields", () => {
        const input = {
          deviceUuid: "550e8400-e29b-41d4-a716-446655440000",
          sessionUuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: 1704110400000,
          dataType: "record",
          key: "test",
          value: { data: "test" },
          unknownField: "should be removed",
        };

        const { error, value } = logInputSchema.validate(input);
        expect(error).toBeUndefined();
        expect(value).not.toHaveProperty("unknownField");
      });
    });

    describe("invalid deviceUuid", () => {
      it("should reject missing deviceUuid", () => {
        const input = {
          sessionUuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: 1704110400000,
          dataType: "record",
          key: "test",
          value: { data: "test" },
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeDefined();
        expect(error?.details[0].path).toContain("deviceUuid");
      });

      it("should reject invalid UUID format", () => {
        const input = {
          deviceUuid: "invalid-uuid",
          sessionUuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: 1704110400000,
          dataType: "record",
          key: "test",
          value: { data: "test" },
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeDefined();
        expect(error?.details[0].message).toContain("valid UUID v4 format");
      });
    });

    describe("invalid dataType", () => {
      it("should reject missing dataType", () => {
        const input = {
          deviceUuid: "550e8400-e29b-41d4-a716-446655440000",
          sessionUuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: 1704110400000,
          key: "test",
          value: { data: "test" },
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeDefined();
        expect(error?.details[0].path).toContain("dataType");
      });

      it("should reject invalid dataType values", () => {
        const input = {
          deviceUuid: "550e8400-e29b-41d4-a716-446655440000",
          sessionUuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: 1704110400000,
          dataType: "invalid",
          key: "test",
          value: { data: "test" },
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeDefined();
        expect(error?.details[0].message).toContain("must be one of");
      });
    });

    describe("invalid key", () => {
      it("should reject missing key", () => {
        const input = {
          deviceUuid: "550e8400-e29b-41d4-a716-446655440000",
          sessionUuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: 1704110400000,
          dataType: "record",
          value: { data: "test" },
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeDefined();
        expect(error?.details[0].path).toContain("key");
      });

      it("should reject key exceeding 255 characters", () => {
        const input = {
          deviceUuid: "550e8400-e29b-41d4-a716-446655440000",
          sessionUuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: 1704110400000,
          dataType: "record",
          key: "a".repeat(256),
          value: { data: "test" },
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeDefined();
        expect(error?.details[0].message).toContain("must not exceed 255");
      });
    });

    describe("invalid value", () => {
      it("should reject missing value", () => {
        const input = {
          deviceUuid: "550e8400-e29b-41d4-a716-446655440000",
          sessionUuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: 1704110400000,
          dataType: "record",
          key: "test",
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeDefined();
        expect(error?.details[0].path).toContain("value");
      });

      it("should reject non-object value types", () => {
        const input = {
          deviceUuid: "550e8400-e29b-41d4-a716-446655440000",
          sessionUuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: 1704110400000,
          dataType: "record",
          key: "test",
          value: "not an object",
        };

        const { error } = logInputSchema.validate(input);
        expect(error).toBeDefined();
        expect(error?.details[0].message).toContain("must be a valid JSON object");
      });
    });
  });

  describe("logFiltersSchema", () => {
    it("should accept valid filters", () => {
      const filters = {
        deviceUuid: "550e8400-e29b-41d4-a716-446655440000",
        sessionUuid: "550e8400-e29b-41d4-a716-446655440001",
        dataType: "error",
        startTime: "2024-01-01T00:00:00.000Z",
        endTime: "2024-01-31T23:59:59.999Z",
      };

      const { error } = logFiltersSchema.validate(filters);
      expect(error).toBeUndefined();
    });

    it("should accept empty filters", () => {
      const { error } = logFiltersSchema.validate({});
      expect(error).toBeUndefined();
    });

    it("should reject invalid UUID in filters", () => {
      const filters = { deviceUuid: "invalid-uuid" };
      const { error } = logFiltersSchema.validate(filters);
      expect(error).toBeDefined();
    });

    it("should reject invalid dataType in filters", () => {
      const filters = { dataType: "invalid" };
      const { error } = logFiltersSchema.validate(filters);
      expect(error).toBeDefined();
    });
  });

  describe("paginationSchema", () => {
    it("should accept valid pagination parameters", () => {
      const pagination = { page: 1, pageSize: 20 };
      const { error, value } = paginationSchema.validate(pagination);
      expect(error).toBeUndefined();
      expect(value).toEqual(pagination);
    });

    it("should use default values when not provided", () => {
      const { error, value } = paginationSchema.validate({});
      expect(error).toBeUndefined();
      expect(value.page).toBe(1);
      expect(value.pageSize).toBe(20);
    });

    it("should reject page less than 1", () => {
      const { error } = paginationSchema.validate({ page: 0 });
      expect(error).toBeDefined();
    });

    it("should reject pageSize greater than 100", () => {
      const { error } = paginationSchema.validate({ pageSize: 101 });
      expect(error).toBeDefined();
    });
  });

  describe("deviceUuidParamSchema", () => {
    it("should accept valid UUID parameter", () => {
      const { error } = deviceUuidParamSchema.validate({
        uuid: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(error).toBeUndefined();
    });

    it("should reject invalid UUID", () => {
      const { error } = deviceUuidParamSchema.validate({ uuid: "invalid" });
      expect(error).toBeDefined();
    });
  });

  describe("timeRangeQuerySchema", () => {
    it("should accept valid time range", () => {
      const query = {
        startTime: "2024-01-01T00:00:00.000Z",
        endTime: "2024-01-31T23:59:59.999Z",
      };
      const { error } = timeRangeQuerySchema.validate(query);
      expect(error).toBeUndefined();
    });

    it("should reject when endTime is before startTime", () => {
      const query = {
        startTime: "2024-01-31T23:59:59.999Z",
        endTime: "2024-01-01T00:00:00.000Z",
      };
      const { error } = timeRangeQuerySchema.validate(query);
      expect(error).toBeDefined();
    });
  });

  describe("logIdParamSchema", () => {
    it("should accept valid log ID", () => {
      const { error } = logIdParamSchema.validate({ id: 123 });
      expect(error).toBeUndefined();
    });

    it("should reject negative ID", () => {
      const { error } = logIdParamSchema.validate({ id: -1 });
      expect(error).toBeDefined();
    });
  });
});
