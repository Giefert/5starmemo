-- Migration 018: allow automatically in-season Fish cards to be hidden from
-- the Bulletin without changing the card's underlying seasonal status.

CREATE TABLE in_season_bulletin_suppressions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (restaurant_id, card_id)
);

CREATE INDEX idx_in_season_suppressions_restaurant
    ON in_season_bulletin_suppressions (restaurant_id, created_at);
