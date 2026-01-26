import request from "supertest";
import { createApp } from "./app";
import { sequelize } from "./config/database";

describe("Express App Integration", () => {
  const app = createApp();

  afterAll(async () => {
    // Close database connection to prevent Jest from hanging
    await sequelize.close();
  });

  describe("GET /health", () => {
    it("should return 200 and healthy status", async () => {
      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "ok");
      expect(response.body.checks).toHaveProperty("database");
      expect(response.body.checks.database).toHaveProperty("status", "healthy");
    });
  });

  describe("GET /metrics", () => {
    it("should return 200 and prometheus metrics", async () => {
      const response = await request(app).get("/metrics");
      expect(response.status).toBe(200);
      expect(response.text).toContain("http_request_duration_seconds");
    });
  });

  describe("GET /api-docs", () => {
    it("should return 200 for swagger docs", async () => {
      const response = await request(app).get("/api-docs/");
      expect(response.status).toBe(200);
      expect(response.text).toContain("swagger-ui");
    });
  });

  describe("GET /api-docs.json", () => {
    it("should return 200 and swagger spec JSON", async () => {
      const response = await request(app).get("/api-docs.json");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("openapi");
    });
  });

  describe("Static Files", () => {
    it("should serve index.html for root path", async () => {
      const response = await request(app).get("/");
      expect(response.status).toBe(200);
      expect(response.text).toContain("<!DOCTYPE html>");
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for unknown routes", async () => {
      const response = await request(app).get("/api/unknown-route");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toHaveProperty("code", "NOT_FOUND");
    });
  });
});
