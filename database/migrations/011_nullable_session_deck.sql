-- Migration 011: allow study_sessions without a deck.
-- Bulletin "study this section" launches a joint session over an arbitrary
-- mix of cards and decks from a curation kind, so deck_id is no longer the
-- right key. Sessions created from the bulletin store NULL deck_id and use
-- curation_kind for provenance.

ALTER TABLE study_sessions ALTER COLUMN deck_id DROP NOT NULL;

ALTER TABLE study_sessions
    ADD COLUMN curation_kind TEXT
    CHECK (curation_kind IN ('specials', 'new_item', 'featured', 'in_season'));

ALTER TABLE study_sessions
    ADD CONSTRAINT study_sessions_deck_or_curation
    CHECK (deck_id IS NOT NULL OR curation_kind IS NOT NULL);
