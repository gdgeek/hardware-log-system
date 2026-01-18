/**
 * Test database configuration
 * Uses mocked Sequelize for testing without requiring a real database
 */

/**
 * Mock database setup - no actual database needed
 * Tests will use mocked repositories instead
 */
export function setupTestEnvironment(): void {
  // Set test environment variable
  process.env.NODE_ENV = 'test';
  process.env.SKIP_DB_TESTS = 'true';
}

/**
 * Clean up test environment
 */
export function teardownTestEnvironment(): void {
  // Clean up if needed
}
