import hmac from "crypto";
import { Project } from "../models/Project";
import { LogInput, ValidationError } from "../types";
import { logger } from "../config/logger";

/**
 * Service for handling signature verification
 */
export class SignatureService {
  /**
   * Maximum allowed time skew between client and server (5 minutes)
   */
  private static readonly MAX_TIME_SKEW_MS = 5 * 60 * 1000;

  /**
   * Verifies the signature of a log input
   * @param input The log input data
   * @returns Promise resolving to the project if signature is valid
   * @throws ValidationError if signature or timestamp is invalid
   */
  static async verify(input: LogInput): Promise<Project> {
    const {
      projectId,
      timestamp,
      signature,
      deviceUuid,
      dataType,
      key,
      value,
    } = input;

    // 1. Check timestamp
    const now = Date.now();
    if (Math.abs(now - timestamp) > this.MAX_TIME_SKEW_MS) {
      logger.warn("Signature verification failed: Timestamp evolved", {
        projectId,
        clientTimestamp: timestamp,
        serverTime: now,
      });
      throw new ValidationError(
        "Timestamp is invalid or expired",
        "TIMESTAMP_ERROR",
      );
    }

    // 2. Fetch project authKey
    const project = await Project.findByPk(projectId);
    if (!project) {
      logger.warn("Signature verification failed: Project not found", {
        projectId,
      });
      throw new ValidationError("Project not found", "NOT_FOUND");
    }

    // 3. Reconstruct signature string
    // Format: {projectId}:{deviceUuid}:{timestamp}:{dataType}:{key}:{valueJson}
    const valueJson = JSON.stringify(value);
    // Note: JSON.stringify in JS usually produces compact JSON without spaces by default
    // we should ensure it matches the hardware side.
    const signString = `${projectId}:${deviceUuid}:${timestamp}:${dataType}:${key}:${valueJson}`;

    // 4. Compute HMAC-SHA256
    const computedSignature = hmac
      .createHmac("sha256", project.authKey)
      .update(signString)
      .digest("hex")
      .toLowerCase();

    // 5. Compare signatures (timing safe comparison if possible, but hex strings are usually fine for this use case)
    if (computedSignature !== signature.toLowerCase()) {
      logger.warn("Signature verification failed: Signature mismatch", {
        projectId,
        expected: computedSignature,
        received: signature,
      });
      throw new ValidationError(
        "Signature verification failed",
        "SIGNATURE_ERROR",
      );
    }

    return project;
  }
}
