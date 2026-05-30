-- Decks now carry an explicit admin-chosen type (Food / Bar / Other) picked
-- from a dropdown at creation, replacing the old "derive from card categories"
-- guess. Backfill existing decks using that same derivation — every current
-- deck is already correctly sorted, so this preserves their classification:
--   all card categories are Bar  → 'bar'
--   all card categories are Food → 'food'
--   mixed, or no cards yet       → 'other'
ALTER TABLE decks ADD COLUMN IF NOT EXISTS deck_type TEXT;

WITH cats AS (
  SELECT d.id,
         ARRAY_AGG(DISTINCT c.restaurant_data->>'category')
           FILTER (WHERE c.restaurant_data->>'category' IS NOT NULL) AS card_cats
  FROM decks d
  LEFT JOIN cards c ON c.deck_id = d.id
  GROUP BY d.id
)
UPDATE decks d
   SET deck_type = CASE
     WHEN cats.card_cats IS NULL THEN 'other'
     WHEN cats.card_cats <@ ARRAY['wine','beer','cocktail','spirit','sake'] THEN 'bar'
     WHEN cats.card_cats <@ ARRAY['maki','sauce','fish','dietary','starters','sashimi'] THEN 'food'
     ELSE 'other'
   END
  FROM cats
 WHERE d.id = cats.id;

-- Anything left unset (shouldn't happen) defaults to 'other'.
UPDATE decks SET deck_type = 'other' WHERE deck_type IS NULL;

ALTER TABLE decks ADD CONSTRAINT decks_deck_type_check CHECK (deck_type IN ('food', 'bar', 'other'));
ALTER TABLE decks ALTER COLUMN deck_type SET NOT NULL;
