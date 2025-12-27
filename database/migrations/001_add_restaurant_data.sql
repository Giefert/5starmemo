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
  "itemName": "Château Margaux 2015",
  "category": "wine",
  "description": "Elegant Bordeaux with rich tannins and complex fruit notes",
  "ingredients": ["Cabernet Sauvignon", "Merlot", "Cabernet Franc"],
  "allergens": ["sulfites"],
  "region": "Bordeaux, France",
  "producer": "Château Margaux",
  "vintage": 2015,
  "abv": 13.5,
  "grapeVarieties": ["Cabernet Sauvignon", "Merlot"],
  "tastingNotes": ["blackcurrant", "cedar", "tobacco"],
  "servingTemp": "16-18°C",
  "foodPairings": ["grilled lamb", "aged cheese"],
  "pricePoint": "luxury",
  "specialNotes": "Limited vintage"
}
*/