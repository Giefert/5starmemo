-- Migration: Add Glossary Tables
-- Adds glossary_categories, glossary_terms, and glossary_term_cards tables
-- for the Glossary feature with card linking

-- Glossary categories (admin-defined: 'Techniques', 'Regions', 'Grape Varieties', etc.)
CREATE TABLE glossary_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- hex color code for UI badges
    display_order INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Glossary terms
CREATE TABLE glossary_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term VARCHAR(200) NOT NULL,
    definition TEXT NOT NULL,
    category_id UUID REFERENCES glossary_categories(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Term-card links (many-to-many junction table)
CREATE TABLE glossary_term_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term_id UUID NOT NULL REFERENCES glossary_terms(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    match_field VARCHAR(100), -- e.g., 'grapeVarieties', 'region', 'itemName'
    match_context TEXT, -- the matched text snippet for reference
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(term_id, card_id)
);

-- Indexes for performance
CREATE INDEX idx_glossary_categories_created_by ON glossary_categories(created_by);
CREATE INDEX idx_glossary_categories_display_order ON glossary_categories(display_order);
CREATE INDEX idx_glossary_terms_category_id ON glossary_terms(category_id);
CREATE INDEX idx_glossary_terms_created_by ON glossary_terms(created_by);
CREATE INDEX idx_glossary_terms_term ON glossary_terms(term);
CREATE INDEX idx_glossary_terms_term_lower ON glossary_terms(LOWER(term));
CREATE INDEX idx_glossary_term_cards_term_id ON glossary_term_cards(term_id);
CREATE INDEX idx_glossary_term_cards_card_id ON glossary_term_cards(card_id);

-- Apply update triggers to glossary tables (uses existing trigger function)
CREATE TRIGGER update_glossary_categories_updated_at
    BEFORE UPDATE ON glossary_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_glossary_terms_updated_at
    BEFORE UPDATE ON glossary_terms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
