/**
 * Database migration runner
 * 
 * This script applies database migrations to create and update the database schema.
 * 
 * Usage:
 *   npm run migrate        - Apply all pending migrations
 *   npm run migrate:down   - Rollback the last migration
 * 
 * Requirements: 5.1, 5.3
 */

import { sequelize } from '../../config/database';
import { logger } from '../../config/logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Migration record interface
 */
interface MigrationRecord {
  name: string;
  appliedAt: Date;
}

/**
 * Creates the migrations tracking table if it doesn't exist
 */
async function createMigrationsTable(): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

/**
 * Gets the list of applied migrations
 */
async function getAppliedMigrations(): Promise<string[]> {
  const [results] = await sequelize.query(
    'SELECT name FROM migrations ORDER BY name'
  );
  return (results as MigrationRecord[]).map(r => r.name);
}

/**
 * Records a migration as applied
 */
async function recordMigration(name: string): Promise<void> {
  await sequelize.query(
    'INSERT INTO migrations (name) VALUES (?)',
    { replacements: [name] }
  );
}

/**
 * Removes a migration record (for rollback - not currently used)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _removeMigrationRecord(name: string): Promise<void> {
  await sequelize.query(
    'DELETE FROM migrations WHERE name = ?',
    { replacements: [name] }
  );
}

/**
 * Gets all migration files from the migrations directory
 */
function getMigrationFiles(): string[] {
  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir);
  
  return files
    .filter(f => f.endsWith('.sql'))
    .sort();
}

/**
 * Applies a single migration file
 */
async function applyMigration(filename: string): Promise<void> {
  const filepath = path.join(__dirname, filename);
  const sql = fs.readFileSync(filepath, 'utf8');
  
  logger.info(`Applying migration: ${filename}`);
  
  try {
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      await sequelize.query(statement);
    }
    
    await recordMigration(filename);
    logger.info(`Migration applied successfully: ${filename}`);
  } catch (error) {
    logger.error(`Failed to apply migration: ${filename}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Applies all pending migrations
 */
export async function migrateUp(): Promise<void> {
  try {
    await createMigrationsTable();
    
    const appliedMigrations = await getAppliedMigrations();
    const allMigrations = getMigrationFiles();
    const pendingMigrations = allMigrations.filter(
      m => !appliedMigrations.includes(m)
    );
    
    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations');
      return;
    }
    
    logger.info(`Found ${pendingMigrations.length} pending migration(s)`);
    
    for (const migration of pendingMigrations) {
      await applyMigration(migration);
    }
    
    logger.info('All migrations applied successfully');
  } catch (error) {
    logger.error('Migration failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Rollback migrations (not implemented - requires down migration files)
 */
export async function migrateDown(): Promise<void> {
  logger.warn('Migration rollback not implemented yet');
  logger.info('To rollback, manually drop tables and re-run migrations');
}

/**
 * Main execution when run as a script
 */
if (require.main === module) {
  const command = process.argv[2] || 'up';
  
  (async () => {
    try {
      if (command === 'up') {
        await migrateUp();
      } else if (command === 'down') {
        await migrateDown();
      } else {
        logger.error(`Unknown command: ${command}`);
        logger.info('Usage: ts-node migrate.ts [up|down]');
        process.exit(1);
      }
      
      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error('Migration script failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      await sequelize.close();
      process.exit(1);
    }
  })();
}
