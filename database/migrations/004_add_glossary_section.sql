-- Add section column to glossary_terms to distinguish between Glossary and Encyclopedia terms
ALTER TABLE glossary_terms ADD COLUMN section VARCHAR(20) NOT NULL DEFAULT 'glossary';
-- Valid values: 'glossary', 'encyclopedia'
CREATE INDEX idx_glossary_terms_section ON glossary_terms(section);
