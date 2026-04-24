/**
 * One-time migration: upload local images to R2 and update DB URLs.
 *
 * Usage:
 *   R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
 *   R2_BUCKET_NAME=... R2_PUBLIC_URL=... \
 *   DB_PASSWORD=... \
 *   npx ts-node database/migrations/007_migrate_images_to_r2.ts [uploads_dir]
 *
 * uploads_dir defaults to ./web-api/uploads/images
 *
 * Idempotent — skips rows that already have absolute URLs.
 */

import { Pool } from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || '5starmemo',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!.replace(/\/$/, '');
const UPLOADS_DIR = process.argv[2] || path.resolve(__dirname, '../../web-api/uploads/images');

async function main() {
  // Find all cards with local image URLs
  const result = await pool.query(
    "SELECT id, image_url FROM cards WHERE image_url IS NOT NULL AND image_url LIKE '/uploads/images/%'"
  );

  console.log(`Found ${result.rows.length} cards with local image URLs`);
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of result.rows) {
    const filename = path.basename(row.image_url);
    const localPath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(localPath)) {
      console.warn(`  SKIP ${filename} — file not found on disk`);
      skipped++;
      continue;
    }

    try {
      const webpBuffer = await sharp(localPath)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const key = `images/${uuidv4()}.webp`;

      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: webpBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }));

      const newUrl = `${PUBLIC_URL}/${key}`;
      await pool.query('UPDATE cards SET image_url = $1 WHERE id = $2', [newUrl, row.id]);
      migrated++;
      console.log(`  OK ${filename} → ${key}`);
    } catch (err) {
      console.error(`  FAIL ${filename}:`, err);
      failed++;
    }
  }

  console.log(`\nDone: ${migrated} migrated, ${skipped} skipped, ${failed} failed`);
  await pool.end();
}

main();
