-- Migration 008: Multi-tenant restaurants
-- Introduces a restaurants table and stamps restaurant_id on every tenant-
-- scoped table. All existing rows are backfilled to "Hidden Fish" (the only
-- tenant prior to this migration). After this runs, every row in the system
-- belongs to exactly one restaurant, and queries must filter by it.

-- 1. Restaurants table.
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Bootstrap the existing tenant.
INSERT INTO restaurants (name, slug) VALUES ('Hidden Fish', 'hidden-fish');

-- 3. Add restaurant_id to every tenant-scoped table, backfill, then enforce
--    NOT NULL. ON DELETE NO ACTION (default) prevents accidental restaurant
--    deletion while children exist.
ALTER TABLE users ADD COLUMN restaurant_id UUID REFERENCES restaurants(id);
UPDATE users SET restaurant_id = (SELECT id FROM restaurants WHERE slug = 'hidden-fish');
ALTER TABLE users ALTER COLUMN restaurant_id SET NOT NULL;

ALTER TABLE decks ADD COLUMN restaurant_id UUID REFERENCES restaurants(id);
UPDATE decks SET restaurant_id = (SELECT id FROM restaurants WHERE slug = 'hidden-fish');
ALTER TABLE decks ALTER COLUMN restaurant_id SET NOT NULL;

ALTER TABLE categories ADD COLUMN restaurant_id UUID REFERENCES restaurants(id);
UPDATE categories SET restaurant_id = (SELECT id FROM restaurants WHERE slug = 'hidden-fish');
ALTER TABLE categories ALTER COLUMN restaurant_id SET NOT NULL;

ALTER TABLE glossary_categories ADD COLUMN restaurant_id UUID REFERENCES restaurants(id);
UPDATE glossary_categories SET restaurant_id = (SELECT id FROM restaurants WHERE slug = 'hidden-fish');
ALTER TABLE glossary_categories ALTER COLUMN restaurant_id SET NOT NULL;

ALTER TABLE glossary_terms ADD COLUMN restaurant_id UUID REFERENCES restaurants(id);
UPDATE glossary_terms SET restaurant_id = (SELECT id FROM restaurants WHERE slug = 'hidden-fish');
ALTER TABLE glossary_terms ALTER COLUMN restaurant_id SET NOT NULL;

-- 4. glossary_categories.name was globally unique; rescope to per-restaurant
--    so two tenants can both have a "Wines" category.
ALTER TABLE glossary_categories DROP CONSTRAINT glossary_categories_name_key;
ALTER TABLE glossary_categories
    ADD CONSTRAINT glossary_categories_restaurant_name_key UNIQUE (restaurant_id, name);

-- 5. Indexes for tenant filtering. Every list query filters by restaurant_id.
CREATE INDEX idx_users_restaurant_id ON users(restaurant_id);
CREATE INDEX idx_decks_restaurant_id ON decks(restaurant_id);
CREATE INDEX idx_categories_restaurant_id ON categories(restaurant_id);
CREATE INDEX idx_glossary_categories_restaurant_id ON glossary_categories(restaurant_id);
CREATE INDEX idx_glossary_terms_restaurant_id ON glossary_terms(restaurant_id);
