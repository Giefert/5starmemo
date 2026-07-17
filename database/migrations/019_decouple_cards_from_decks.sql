-- Cards are restaurant-owned canonical records. Deck membership and ordering
-- live in a many-to-many join so one card can be reused by multiple decks.

ALTER TABLE cards
  ADD COLUMN restaurant_id uuid;

UPDATE cards c
SET restaurant_id = d.restaurant_id
FROM decks d
WHERE d.id = c.deck_id;

ALTER TABLE cards
  ALTER COLUMN restaurant_id SET NOT NULL,
  ADD CONSTRAINT cards_restaurant_id_fkey
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;

CREATE TABLE deck_cards (
  deck_id uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  card_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (deck_id, card_id)
);

INSERT INTO deck_cards (deck_id, card_id, card_order, created_at)
SELECT deck_id, id, card_order, created_at
FROM cards;

CREATE INDEX idx_deck_cards_card_id ON deck_cards(card_id);
CREATE INDEX idx_deck_cards_order ON deck_cards(deck_id, card_order);
CREATE INDEX idx_cards_restaurant_id ON cards(restaurant_id);
CREATE INDEX idx_cards_restaurant_category
  ON cards(restaurant_id, (restaurant_data->>'category'));

ALTER TABLE cards DROP CONSTRAINT cards_deck_id_fkey;
DROP INDEX idx_cards_deck_id;
DROP INDEX idx_cards_order;
ALTER TABLE cards DROP COLUMN deck_id, DROP COLUMN card_order;
