/**
 * Migration: Normalize restaurant_data JSONB to V2 discriminated union shape.
 *
 * After running this, all restaurant_data rows will contain only category-valid fields.
 * This lets us remove migrateToV2() and RestaurantCardDataV1 from the codebase.
 *
 * Usage: npx ts-node database/migrations/006_normalize_restaurant_data_v2.ts
 *
 * Requires DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD env vars.
 * Idempotent — safe to run multiple times.
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || '5starmemo',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// Inline the migration logic so this script is self-contained
// and can be deleted after running (no ongoing dependency on shared/types)
function migrateRow(data: any): any {
  if (!data || !data.category) return data;

  const base: any = {
    itemName: data.itemName,
    category: data.category,
    description: data.description,
    pricePoint: data.pricePoint,
    specialNotes: data.specialNotes,
  };

  const foodBeverageShared: any = {
    ingredients: data.ingredients,
    allergens: data.allergens,
    region: data.region,
    producer: data.producer,
    tastingNotes: data.tastingNotes,
    servingTemp: data.servingTemp,
    foodPairings: data.foodPairings,
  };

  switch (data.category) {
    case 'maki':
      return { ...base, category: 'maki', topping: data.topping, base: data.base, sauce: data.sauce, paper: data.paper, gluten: data.gluten };
    case 'wine':
      return { ...base, ...foodBeverageShared, category: 'wine', abv: data.abv, vintage: data.vintage, grapeVarieties: data.grapeVarieties, appellation: data.appellation, bodyLevel: data.bodyLevel, sweetnessLevel: data.sweetnessLevel, acidityLevel: data.acidityLevel, tanninLevel: data.tanninLevel };
    case 'beer':
      return { ...base, ...foodBeverageShared, category: 'beer', abv: data.abv };
    case 'cocktail':
      return { ...base, category: 'cocktail', abv: data.abv, alcohol: data.alcohol, other: data.other, garnish: data.garnish };
    case 'spirit':
      return { ...base, ...foodBeverageShared, category: 'spirit', abv: data.abv };
    case 'sake':
      return { ...base, ...foodBeverageShared, category: 'sake', classification: data.classification, abv: data.abv, vintage: data.vintage, riceVariety: data.riceVariety };
    case 'sauce':
      return { ...base, category: 'sauce', ingredients: data.ingredients };
    case 'fish':
      return { ...base, category: 'fish', taste: data.taste, country: data.country };
    default:
      return data;
  }
}

// Strip undefined values so JSONB doesn't contain "key": null noise
function stripUndefined(obj: any): any {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
}

async function main() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id, restaurant_data FROM cards WHERE restaurant_data IS NOT NULL');
    console.log(`Found ${result.rows.length} cards with restaurant_data`);

    let updated = 0;
    await client.query('BEGIN');

    for (const row of result.rows) {
      const data = typeof row.restaurant_data === 'string' ? JSON.parse(row.restaurant_data) : row.restaurant_data;
      const normalized = stripUndefined(migrateRow(data));
      const original = stripUndefined(data);

      // Only update if the normalized form differs
      if (JSON.stringify(normalized) !== JSON.stringify(original)) {
        await client.query('UPDATE cards SET restaurant_data = $1 WHERE id = $2', [JSON.stringify(normalized), row.id]);
        updated++;
      }
    }

    await client.query('COMMIT');
    console.log(`Normalized ${updated} rows (${result.rows.length - updated} already clean)`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
