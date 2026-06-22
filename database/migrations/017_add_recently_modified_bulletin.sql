-- Migration 017: add the "Recently modified" Bulletin curation category.

ALTER TABLE restaurant_curations DROP CONSTRAINT restaurant_curations_kind_check;
ALTER TABLE restaurant_curations
    ADD CONSTRAINT restaurant_curations_kind_check
    CHECK (kind IN ('specials', 'new_item', 'featured', 'in_season', 'recently_modified'));

ALTER TABLE study_sessions DROP CONSTRAINT IF EXISTS study_sessions_curation_kind_check;
ALTER TABLE study_sessions
    ADD CONSTRAINT study_sessions_curation_kind_check
    CHECK (curation_kind IN ('specials', 'new_item', 'featured', 'in_season', 'recently_modified'));
