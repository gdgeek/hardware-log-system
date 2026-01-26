/**
 * Unit tests for Log model
 */

import { Log } from "./Log";

describe("Log Model", () => {
  describe("Model Definition", () => {
    it("should have correct table name", () => {
      expect(Log.tableName).toBe("logs");
    });

    it("should have correct field mappings", () => {
      const attributes = Log.getAttributes();

      expect(attributes.id.field).toBeDefined();
      expect(attributes.deviceUuid.field).toBe("device_uuid");
      expect(attributes.dataType.field).toBe("data_type");
      expect(attributes.logKey.field).toBe("log_key");
      expect(attributes.logValue.field).toBe("log_value");
      expect(attributes.sessionUuid.field).toBe("session_uuid");
      expect(attributes.clientTimestamp.field).toBe("client_timestamp");
      expect(attributes.clientIp.field).toBe("client_ip");
      expect(attributes.createdAt.field).toBe("created_at");
    });

    it("should have correct data types", () => {
      const attributes = Log.getAttributes();

      expect(attributes.id.type.constructor.name).toBe("BIGINT");
      expect(attributes.deviceUuid.type.constructor.name).toBe("STRING");
      expect(attributes.dataType.type.constructor.name).toBe("ENUM");
      expect(attributes.logKey.type.constructor.name).toBe("STRING");
      expect(["JSON", "JSONTYPE"]).toContain(attributes.logValue.type.constructor.name);
      expect(attributes.sessionUuid.type.constructor.name).toBe("STRING");
      expect(attributes.clientTimestamp.type.constructor.name).toBe("BIGINT");
      expect(attributes.createdAt.type.constructor.name).toBe("DATE");
    });

    it("should have correct validation rules for deviceUuid", () => {
      const attributes = Log.getAttributes();
      expect(attributes.deviceUuid.allowNull).toBe(false);
      expect(attributes.deviceUuid.validate).toBeDefined();
    });

    it("should have correct validation rules for dataType", () => {
      const attributes = Log.getAttributes();
      expect(attributes.dataType.allowNull).toBe(false);
      expect(attributes.dataType.type.constructor.name).toBe("ENUM");
    });

    it("should have correct validation rules for logKey", () => {
      const attributes = Log.getAttributes();
      expect(attributes.logKey.allowNull).toBe(false);
      expect(attributes.logKey.validate).toBeDefined();
    });

    it("should have correct validation rules for logValue", () => {
      const attributes = Log.getAttributes();
      expect(attributes.logValue.allowNull).toBe(false);
    });
  });

  describe("Model Attributes", () => {
    it("should define all required attributes", () => {
      const attributes = Log.getAttributes();
      const attributeNames = Object.keys(attributes);

      expect(attributeNames).toContain("id");
      expect(attributeNames).toContain("deviceUuid");
      expect(attributeNames).toContain("dataType");
      expect(attributeNames).toContain("logKey");
      expect(attributeNames).toContain("logValue");
      expect(attributeNames).toContain("sessionUuid");
      expect(attributeNames).toContain("clientTimestamp");
      expect(attributeNames).toContain("clientIp");
      expect(attributeNames).toContain("createdAt");
    });

    it("should have id as primary key with autoIncrement", () => {
      const attributes = Log.getAttributes();
      expect(attributes.id.primaryKey).toBe(true);
      expect(attributes.id.autoIncrement).toBe(true);
    });

    it("should have createdAt with defaultValue", () => {
      const attributes = Log.getAttributes();
      expect(attributes.createdAt.defaultValue).toBeDefined();
    });
  });
});
