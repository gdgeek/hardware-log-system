import hmac from "crypto";
import { SignatureService } from "./SignatureService";
import { Project } from "../models/Project";
import { LogInput, DataType } from "../types";
import { ValidationError } from "../types";

// Mock Project model
jest.mock("../models/Project");

describe("SignatureService", () => {
  const mockProject = {
    id: 1,
    name: "Test Project",
    authKey: "test-auth-key",
  };

  const validTimestamp = Date.now();
  const validLogInput: LogInput = {
    projectId: 1,
    deviceUuid: "550e8400-e29b-41d4-a716-446655440000",
    sessionUuid: "session-123",
    timestamp: validTimestamp,
    dataType: "record" as DataType,
    key: "temperature",
    value: { val: 25.5 },
    signature: "", // Will be computed
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Project.findByPk as jest.Mock).mockResolvedValue(mockProject);
  });

  const computeSignature = (input: LogInput, key: string) => {
    const valueJson = JSON.stringify(input.value);
    const signString = `${input.projectId}:${input.deviceUuid}:${input.timestamp}:${input.dataType}:${input.key}:${valueJson}`;
    return hmac
      .createHmac("sha256", key)
      .update(signString)
      .digest("hex")
      .toLowerCase();
  };

  it("should successfully verify a valid signature", async () => {
    const signature = computeSignature(validLogInput, mockProject.authKey);
    const inputWithSign = { ...validLogInput, signature };

    const result = await SignatureService.verify(inputWithSign);
    expect(result).toEqual(mockProject);
    expect(Project.findByPk).toHaveBeenCalledWith(1);
  });

  it("should throw ValidationError if timestamp is expired (too old)", async () => {
    const expiredTimestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago
    const input = { ...validLogInput, timestamp: expiredTimestamp };

    await expect(SignatureService.verify(input)).rejects.toThrow(
      new ValidationError("Timestamp is invalid or expired", "TIMESTAMP_ERROR"),
    );
  });

  it("should throw ValidationError if timestamp is in the future (too new)", async () => {
    const futureTimestamp = Date.now() + 6 * 60 * 1000; // 6 minutes future
    const input = { ...validLogInput, timestamp: futureTimestamp };

    await expect(SignatureService.verify(input)).rejects.toThrow(
      new ValidationError("Timestamp is invalid or expired", "TIMESTAMP_ERROR"),
    );
  });

  it("should throw ValidationError if project is not found", async () => {
    (Project.findByPk as jest.Mock).mockResolvedValue(null);
    const signature = computeSignature(validLogInput, mockProject.authKey);
    const input = { ...validLogInput, signature };

    await expect(SignatureService.verify(input)).rejects.toThrow(
      new ValidationError("Project not found", "NOT_FOUND"),
    );
  });

  it("should throw ValidationError if signature mismatches", async () => {
    const wrongSignature = "wrong-signature-123";
    const input = { ...validLogInput, signature: wrongSignature };

    await expect(SignatureService.verify(input)).rejects.toThrow(
      new ValidationError("Signature verification failed", "SIGNATURE_ERROR"),
    );
  });

  it("should be case-insensitive for signature check", async () => {
    const signature = computeSignature(
      validLogInput,
      mockProject.authKey,
    ).toUpperCase();
    const input = { ...validLogInput, signature };

    const result = await SignatureService.verify(input);
    expect(result).toEqual(mockProject);
  });
});
