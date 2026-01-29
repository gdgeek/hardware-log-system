/**
 * 项目管理集成测试
 * 测试项目CRUD操作和数据完整性
 */

const request = require('supertest');
const app = require('../../src/app');

describe('Project Management Integration Tests', () => {
  let authToken;
  let testProjectId;

  beforeAll(async () => {
    // 获取认证token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: 'admin123' });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // 清理测试数据
    if (testProjectId) {
      await request(app)
        .delete(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }
  });

  describe('Project CRUD Operations', () => {
    test('should create a new project', async () => {
      const projectData = {
        uuid: 'test-project-' + Date.now(),
        name: '测试项目',
        password: null,
        columnMapping: {
          temperature: '温度',
          humidity: '湿度'
        }
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.uuid).toBe(projectData.uuid);
      expect(response.body.data.name).toBe(projectData.name);
      expect(response.body.data.hasPassword).toBe(false);
      expect(response.body.data.columnMapping).toEqual(projectData.columnMapping);

      testProjectId = response.body.data.id;
    });

    test('should get all projects', async () => {
      const response = await request(app)
        .get('/api/v1/projects');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should get project by id', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testProjectId);
    });

    test('should update project', async () => {
      const updateData = {
        uuid: 'test-project-updated-' + Date.now(),
        name: '更新的测试项目',
        password: 'test123',
        columnMapping: {
          temperature: '温度',
          humidity: '湿度',
          pressure: '压力'
        }
      };

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.hasPassword).toBe(true);
      expect(response.body.data.columnMapping).toEqual(updateData.columnMapping);
    });

    test('should delete project', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 验证项目已删除
      const getResponse = await request(app)
        .get(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);

      testProjectId = null; // 防止afterAll中重复删除
    });
  });

  describe('Project Authentication', () => {
    let protectedProjectId;

    beforeAll(async () => {
      // 创建受保护的项目
      const projectData = {
        uuid: 'protected-test-' + Date.now(),
        name: '受保护的测试项目',
        password: 'secret123',
        columnMapping: {}
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData);

      protectedProjectId = response.body.data.id;
    });

    afterAll(async () => {
      if (protectedProjectId) {
        await request(app)
          .delete(`/api/v1/projects/${protectedProjectId}`)
          .set('Authorization', `Bearer ${authToken}`);
      }
    });

    test('should authenticate with correct password', async () => {
      const response = await request(app)
        .post('/api/v1/projects/auth')
        .send({
          projectId: protectedProjectId,
          password: 'secret123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/v1/projects/auth')
        .send({
          projectId: protectedProjectId,
          password: 'wrong-password'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should allow access to public project without password', async () => {
      // 创建公开项目
      const projectData = {
        uuid: 'public-test-' + Date.now(),
        name: '公开测试项目',
        password: null,
        columnMapping: {}
      };

      const createResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData);

      const publicProjectId = createResponse.body.data.id;

      const authResponse = await request(app)
        .post('/api/v1/projects/auth')
        .send({
          projectId: publicProjectId,
          password: ''
        });

      expect(authResponse.status).toBe(200);
      expect(authResponse.body.success).toBe(true);

      // 清理
      await request(app)
        .delete(`/api/v1/projects/${publicProjectId}`)
        .set('Authorization', `Bearer ${authToken}`);
    });
  });

  describe('Column Mapping', () => {
    let mappingProjectId;

    beforeAll(async () => {
      const projectData = {
        uuid: 'mapping-test-' + Date.now(),
        name: '列映射测试项目',
        password: null,
        columnMapping: {
          temp: '温度',
          hum: '湿度',
          press: '压力',
          batt: '电池电量'
        }
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData);

      mappingProjectId = response.body.data.id;
    });

    afterAll(async () => {
      if (mappingProjectId) {
        await request(app)
          .delete(`/api/v1/projects/${mappingProjectId}`)
          .set('Authorization', `Bearer ${authToken}`);
      }
    });

    test('should get column mapping for project', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${mappingProjectId}/column-mapping`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        temp: '温度',
        hum: '湿度',
        press: '压力',
        batt: '电池电量'
      });
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/v1/projects/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    test('should return 409 for duplicate UUID', async () => {
      const projectData = {
        uuid: 'duplicate-test',
        name: '重复UUID测试',
        password: null,
        columnMapping: {}
      };

      // 创建第一个项目
      const firstResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData);

      expect(firstResponse.status).toBe(201);

      // 尝试创建相同UUID的项目
      const secondResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData);

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.error.code).toBe('PROJECT_EXISTS');

      // 清理
      await request(app)
        .delete(`/api/v1/projects/${firstResponse.body.data.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    test('should require authentication for protected endpoints', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .send({
          uuid: 'no-auth-test',
          name: '无认证测试',
          password: null,
          columnMapping: {}
        });

      expect(response.status).toBe(401);
    });
  });
});