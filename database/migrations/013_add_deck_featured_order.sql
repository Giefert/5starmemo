-- Admin-controlled ordering for featured decks. Featured decks float to the top
-- of the student deck list; featured_order lets management pin their sequence.
-- NULL means "featured but not yet ordered" — sorts after explicitly-ordered
-- decks (NULLS LAST in the mobile query).
ALTER TABLE decks ADD COLUMN IF NOT EXISTS featured_order INTEGER;

-- Seed existing featured decks with the order they already appear in (the old
-- query sorted featured decks by created_at DESC), so nothing visibly moves
-- until an admin reorders them.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY restaurant_id ORDER BY created_at DESC) - 1 AS rn
  FROM decks
  WHERE is_featured = true
)
UPDATE decks d
   SET featured_order = ranked.rn
  FROM ranked
 WHERE d.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_decks_featured_order
  ON decks(restaurant_id, featured_order)
  WHERE is_featured = true;
