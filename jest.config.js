module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.integration.ts', '**/*.property.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.integration.ts',
    '!src/**/*.property.test.ts',
    '!src/types/**',
    '!src/**/index.ts', // 排除 index.ts 文件（通常只是导出）
    '!src/index.ts', // 排除主入口文件（需要真实服务器）
    '!src/routes/**', // 排除路由文件（集成测试中覆盖）
    '!src/models/migrations/**', // 排除迁移脚本
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 75,
      branches: 60,
      functions: 65,
      lines: 75,
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
