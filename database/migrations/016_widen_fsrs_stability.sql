-- FSRS stability is measured in days and can legitimately exceed 99 as cards
-- become mastered. DECIMAL(10,8) only allowed two digits before the decimal.
ALTER TABLE fsrs_cards
  ALTER COLUMN stability TYPE DECIMAL(13,8)
  USING stability::DECIMAL(13,8);
