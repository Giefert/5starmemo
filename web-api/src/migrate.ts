import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || '/app/migrations';

export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const { rows } = await pool.query<{ name: string }>('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map(r => r.name));

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Migration applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration failed: ${file} — ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }
}
