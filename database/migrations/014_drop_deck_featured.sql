-- Remove the server-side featured-deck system. Featuring overlapped with the
-- Bulletin (which already curates "featured" items), so decks no longer carry a
-- featured flag/order. The mobile app now offers a client-side, per-student
-- Favorites list instead. The Bulletin's own `featured` curation is a separate
-- system (restaurant_curations) and is untouched.
DROP INDEX IF EXISTS idx_decks_featured_order;
DROP INDEX IF EXISTS idx_decks_public_featured;
DROP INDEX IF EXISTS idx_decks_is_featured;

ALTER TABLE decks
  DROP COLUMN IF EXISTS featured_order,
  DROP COLUMN IF EXISTS is_featured;
