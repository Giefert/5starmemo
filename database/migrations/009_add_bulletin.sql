-- Migration 009: Bulletin board
-- Backs the new dashboard "Bulletin" panel (web + future mobile tab).
--   1. Free-text announcements per restaurant — array of plain strings.
--   2. Polymorphic curation table for the four expandable panels:
--      Specials, New items, Featured (cards or decks) and
--      Glossary highlight (glossary terms only).
--   The kind/target_type combination is enforced by the application layer
--   because target_id is polymorphic and can't carry a single FK.

ALTER TABLE restaurants
    ADD COLUMN announcements TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE restaurant_curations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    kind TEXT NOT NULL
        CHECK (kind IN ('specials', 'new_item', 'featured', 'glossary_highlight')),
    target_type TEXT NOT NULL
        CHECK (target_type IN ('card', 'deck', 'glossary_term')),
    target_id UUID NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (restaurant_id, kind, target_type, target_id)
);

CREATE INDEX idx_curations_lookup
    ON restaurant_curations (restaurant_id, kind, position);
