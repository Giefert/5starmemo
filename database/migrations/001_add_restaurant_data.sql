-- Migration: Add restaurant_data column to cards table
-- This migration adds support for structured restaurant card data

-- Add the restaurant_data JSONB column to existing cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS restaurant_data JSONB;

-- Add GIN index for restaurant_data for better query performance
CREATE INDEX IF NOT EXISTS idx_cards_restaurant_data ON cards USING GIN(restaurant_data);

-- Add a comment to document the column purpose
COMMENT ON COLUMN cards.restaurant_data IS 'JSON data for restaurant-specific card information (menu items, ingredients, etc.)';

-- Example of restaurant_data structure (for documentation):
/*
{
  "itemName": "Ribeye Steak",
  "category": "food",
  "description": "Prime cut ribeye steak grilled to perfection",
  "ingredients": ["beef", "salt", "pepper", "garlic"],
  "allergens": ["none"],
  "region": "Texas",
  "producer": "Local Ranch",
  "tastingNotes": ["juicy", "tender", "smoky"],
  "servingTemp": "Medium rare",
  "foodPairings": ["red wine", "roasted vegetables"],
  "pricePoint": "premium",
  "specialNotes": "Dry aged 28 days"
}
*/