-- Migration 012: Student roles and per-deck access control.
-- Replaces decks.is_public with explicit access grants. A student sees a deck
-- iff they have a direct grant (user_deck_access) or belong to a role
-- (student_role_assignments) that has a grant (role_deck_access). Existing
-- decks become inaccessible to all students until an admin grants access
-- explicitly via the new Users tab.

-- 1. Custom per-restaurant student roles (e.g. "Sommelier", "Bartender").
CREATE TABLE student_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (restaurant_id, name)
);

CREATE TRIGGER update_student_roles_updated_at
    BEFORE UPDATE ON student_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_student_roles_restaurant_id ON student_roles(restaurant_id);

-- 2. Many-to-many: which roles a given student has.
CREATE TABLE student_role_assignments (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES student_roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_student_role_assignments_role_id ON student_role_assignments(role_id);

-- 3. Decks granted to a role (every student with that role inherits the grant).
CREATE TABLE role_deck_access (
    role_id UUID NOT NULL REFERENCES student_roles(id) ON DELETE CASCADE,
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, deck_id)
);

CREATE INDEX idx_role_deck_access_deck_id ON role_deck_access(deck_id);

-- 4. Decks granted directly to an individual student.
CREATE TABLE user_deck_access (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, deck_id)
);

CREATE INDEX idx_user_deck_access_deck_id ON user_deck_access(deck_id);

-- 5. Drop is_public. No clients are in prod yet (see CLAUDE.md) so no backfill
--    is needed — all existing decks become inaccessible to students until an
--    admin grants access explicitly, which is the new product semantics.
DROP INDEX IF EXISTS idx_decks_public_featured;
DROP INDEX IF EXISTS idx_decks_is_public;
ALTER TABLE decks DROP COLUMN is_public;
