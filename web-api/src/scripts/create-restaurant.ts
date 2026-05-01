/**
 * Bootstrap CLI: create a new restaurant tenant + its first admin.
 *
 * Run inside the production web-api container:
 *   docker compose -f docker-compose.prod.yml exec web-api \
 *     node dist/app/src/scripts/create-restaurant.js
 *
 * This is the only path for onboarding a new restaurant. Once their first
 * admin exists, they self-serve adding more admins/students through the in-app
 * "create user" flow (POST /auth/users). There is no public sign-up.
 */
import dotenv from 'dotenv';
dotenv.config();

import readline from 'readline';
import crypto from 'crypto';
import pool from '../config/database';
import { hashPassword } from '../utils/auth';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function prompt(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

// Readable random password: avoids ambiguous chars (0/O/1/l/I).
function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(16);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}`;
}

async function main() {
  console.log('\n=== Create new restaurant + first admin ===\n');

  const name = await prompt('Restaurant name: ');
  if (!name) throw new Error('Restaurant name is required');

  const defaultSlug = slugify(name);
  const slugInput = await prompt(`Slug [${defaultSlug}]: `);
  const slug = slugInput || defaultSlug;
  if (!slug) throw new Error('Slug is required');

  const email = await prompt('First admin email: ');
  if (!email || !email.includes('@')) throw new Error('Valid admin email is required');

  const username = await prompt('First admin username: ');
  if (!username || username.length < 3) throw new Error('Username must be at least 3 characters');

  const password = generatePassword();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const restaurantResult = await client.query(
      `INSERT INTO restaurants (name, slug) VALUES ($1, $2) RETURNING id`,
      [name, slug]
    );
    const restaurantId = restaurantResult.rows[0].id;

    const passwordHash = await hashPassword(password);

    await client.query(
      `INSERT INTO users (email, username, password_hash, role, restaurant_id)
       VALUES ($1, $2, $3, 'management', $4)`,
      [email, username, passwordHash, restaurantId]
    );

    await client.query('COMMIT');
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      // Unique violation — slug or email collision.
      throw new Error(`Conflict: ${err.detail || err.message}`);
    }
    throw err;
  } finally {
    client.release();
  }

  console.log('\n--- Created ---');
  console.log(`Restaurant: ${name} (slug: ${slug})`);
  console.log(`Admin:      ${email}`);
  console.log(`Username:   ${username}`);
  console.log(`Temp pass:  ${password}`);
  console.log('\nSend these credentials to the customer out of band (email, Signal, etc.).');
  console.log('They should change the password after first login.\n');
}

main()
  .catch(err => {
    console.error('\nError:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await pool.end();
  });
