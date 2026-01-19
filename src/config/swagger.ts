/**
 * Swagger/OpenAPI 配置
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '硬件日志管理系统 API',
      version: '1.0.0',
      description: '用于接收、存储和管理硬件设备日志数据的 RESTful API',
      contact: {
        name: 'GDGeek',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
      {
        url: '/api',
        description: 'API (兼容)',
      },
    ],
    components: {
      schemas: {
        Log: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: '日志 ID' },
            deviceUuid: { type: 'string', format: 'uuid', description: '设备 UUID' },
            projectName: { type: 'string', nullable: true, description: '项目名称' },
            projectVersion: { type: 'string', nullable: true, description: '项目版本' },
            dataType: { type: 'string', enum: ['record', 'warning', 'error'], description: '数据类型' },
            key: { type: 'string', description: '日志键' },
            value: { type: 'object', description: '日志值（JSON）' },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
          },
        },
        LogInput: {
          type: 'object',
          required: ['deviceUuid', 'dataType', 'key', 'value'],
          properties: {
            deviceUuid: { type: 'string', format: 'uuid', description: '设备 UUID' },
            projectName: { type: 'string', maxLength: 100, description: '项目名称（可选）' },
            projectVersion: { type: 'string', maxLength: 50, description: '项目版本（可选）' },
            dataType: { type: 'string', enum: ['record', 'warning', 'error'], description: '数据类型' },
            key: { type: 'string', minLength: 1, maxLength: 255, description: '日志键' },
            value: { type: 'object', description: '日志值（JSON）' },
          },
        },
        PaginatedLogs: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: '#/components/schemas/Log' } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                pageSize: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
        DeviceReport: {
          type: 'object',
          properties: {
            deviceUuid: { type: 'string' },
            totalLogs: { type: 'integer' },
            recordCount: { type: 'integer' },
            warningCount: { type: 'integer' },
            errorCount: { type: 'integer' },
            firstLogTime: { type: 'string', format: 'date-time' },
            lastLogTime: { type: 'string', format: 'date-time' },
          },
        },
        TimeRangeReport: {
          type: 'object',
          properties: {
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            totalLogs: { type: 'integer' },
            recordCount: { type: 'integer' },
            warningCount: { type: 'integer' },
            errorCount: { type: 'integer' },
            deviceCount: { type: 'integer' },
          },
        },
        ErrorReport: {
          type: 'object',
          properties: {
            totalErrors: { type: 'integer' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  deviceUuid: { type: 'string' },
                  key: { type: 'string' },
                  count: { type: 'integer' },
                  lastOccurrence: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Logs', description: '日志管理' },
      { name: 'Reports', description: '统计报表' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
