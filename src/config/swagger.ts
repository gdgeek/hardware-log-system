/**
 * Swagger/OpenAPI 配置
 */

import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "硬件日志管理系统 API",
      version: "1.0.0",
      description: "用于接收、存储和管理硬件设备日志数据的 RESTful API",
      contact: {
        name: "GDGeek",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "API v1",
      },
      {
        url: "/api",
        description: "API (兼容)",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT 认证令牌",
        },
      },
      schemas: {
        Log: {
          type: "object",
          properties: {
            id: { type: "integer", description: "日志 ID" },
            deviceUuid: { type: "string", description: "设备 UUID" },
            sessionUuid: { type: "string", description: "会话 UUID" },
            dataType: { type: "string", enum: ["record", "warning", "error"], description: "数据类型" },
            key: { type: "string", description: "日志键" },
            value: { type: "string", description: "日志值" },
            clientTimestamp: { type: "number", description: "客户端时间戳" },
            createdAt: { type: "string", format: "date-time", description: "创建时间" },
          },
        },
        LogInput: {
          type: "object",
          required: ["deviceUuid", "timestamp", "dataType", "key", "value", "sessionUuid"],
          properties: {
            deviceUuid: { type: "string", description: "设备 UUID" },
            timestamp: { type: "number", description: "客户端 Unix 毫秒时间戳" },
            sessionUuid: { type: "string", description: "会话 UUID" },
            dataType: { type: "string", enum: ["record", "warning", "error"], description: "数据类型" },
            key: { type: "string", minLength: 1, maxLength: 255, description: "日志键" },
            value: { type: "string", description: "日志值" },
          },
        },
        PaginatedLogs: {
          type: "object",
          properties: {
            data: { type: "array", items: { $ref: "#/components/schemas/Log" } },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer" },
                pageSize: { type: "integer" },
                total: { type: "integer" },
                totalPages: { type: "integer" },
              },
            },
          },
        },
        DeviceReport: {
          type: "object",
          properties: {
            deviceUuid: { type: "string" },
            totalLogs: { type: "integer" },
            recordCount: { type: "integer" },
            warningCount: { type: "integer" },
            errorCount: { type: "integer" },
            firstLogTime: { type: "string", format: "date-time" },
            lastLogTime: { type: "string", format: "date-time" },
          },
        },
        TimeRangeReport: {
          type: "object",
          properties: {
            startTime: { type: "string", format: "date-time" },
            endTime: { type: "string", format: "date-time" },
            totalLogs: { type: "integer" },
            recordCount: { type: "integer" },
            warningCount: { type: "integer" },
            errorCount: { type: "integer" },
            deviceCount: { type: "integer" },
          },
        },
        ErrorReport: {
          type: "object",
          properties: {
            totalErrors: { type: "integer" },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  deviceUuid: { type: "string" },
                  key: { type: "string" },
                  count: { type: "integer" },
                  lastOccurrence: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: "Logs", description: "日志管理" },
      { name: "Reports", description: "统计报表" },
    ],
  },
  // 支持开发环境 (.ts) 和生产环境 (.js)
  apis: ["./src/routes/*.ts", "./dist/routes/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
