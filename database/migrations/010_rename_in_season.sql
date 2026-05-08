-- Migration 010: Rename "glossary_highlight" curation slot to "in_season".
-- The slot now holds cards/decks like the other three; glossary-term targets
-- are dropped along with the now-unused 'glossary_term' target_type.

DELETE FROM restaurant_curations WHERE kind = 'glossary_highlight';

ALTER TABLE restaurant_curations DROP CONSTRAINT restaurant_curations_kind_check;
ALTER TABLE restaurant_curations
    ADD CONSTRAINT restaurant_curations_kind_check
    CHECK (kind IN ('specials', 'new_item', 'featured', 'in_season'));

ALTER TABLE restaurant_curations DROP CONSTRAINT restaurant_curations_target_type_check;
ALTER TABLE restaurant_curations
    ADD CONSTRAINT restaurant_curations_target_type_check
    CHECK (target_type IN ('card', 'deck'));
