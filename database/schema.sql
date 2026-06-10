-- 5StarMemo database baseline.
--
-- Generated from the production database with:
--   docker exec 5starmemo-postgres-1 pg_dump --schema-only --no-owner --no-privileges -U postgres 5starmemo
-- (baseline regenerated 2026-06-10, after migration 016)
--
-- A fresh database bootstrapped from this file is already at the state of
-- every migration listed in the INSERT at the bottom, so the runtime
-- migration runner (web-api/src/migrate.ts) will skip them. New migrations
-- go in database/migrations/ as NNN_*.sql; regenerate this baseline with the
-- command above whenever you want to fold applied migrations back in.

--
-- PostgreSQL database dump
--

\restrict 7Gp9LBn5jhYicfkJ67LtBNIcIrWEMVPpbG6rL4Sw2d3T40JuO2Quj9XTEztssDS

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: card_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    session_id uuid NOT NULL,
    card_id uuid NOT NULL,
    fsrs_card_id uuid NOT NULL,
    rating integer NOT NULL,
    CONSTRAINT card_reviews_rating_check CHECK ((rating = ANY (ARRAY[1, 2, 3, 4])))
);


--
-- Name: cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    deck_id uuid NOT NULL,
    image_url character varying(500),
    card_order integer DEFAULT 0 NOT NULL,
    restaurant_data jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: COLUMN cards.restaurant_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cards.restaurant_data IS 'JSON data for restaurant-specific card information (menu items, ingredients, etc.)';


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    color character varying(7),
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    restaurant_id uuid NOT NULL
);


--
-- Name: decks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.decks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    category_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    restaurant_id uuid NOT NULL,
    deck_type text NOT NULL,
    CONSTRAINT decks_deck_type_check CHECK ((deck_type = ANY (ARRAY['food'::text, 'bar'::text, 'other'::text])))
);


--
-- Name: fsrs_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fsrs_cards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    card_id uuid NOT NULL,
    user_id uuid NOT NULL,
    difficulty numeric(10,8) DEFAULT 0 NOT NULL,
    stability numeric(13,8) DEFAULT 0 NOT NULL,
    retrievability numeric(10,8) DEFAULT 0 NOT NULL,
    grade integer DEFAULT 0 NOT NULL,
    lapses integer DEFAULT 0 NOT NULL,
    reps integer DEFAULT 0 NOT NULL,
    state character varying(20) DEFAULT 'new'::character varying NOT NULL,
    last_review timestamp with time zone,
    next_review timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fsrs_cards_state_check CHECK (((state)::text = ANY ((ARRAY['new'::character varying, 'learning'::character varying, 'review'::character varying, 'relearning'::character varying])::text[])))
);


--
-- Name: glossary_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.glossary_categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    color character varying(7),
    display_order integer DEFAULT 0,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    restaurant_id uuid NOT NULL
);


--
-- Name: glossary_term_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.glossary_term_cards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    term_id uuid NOT NULL,
    card_id uuid NOT NULL,
    match_field character varying(100),
    match_context text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: glossary_terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.glossary_terms (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    term character varying(200) NOT NULL,
    definition text NOT NULL,
    category_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    section character varying(20) DEFAULT 'glossary'::character varying NOT NULL,
    restaurant_id uuid NOT NULL
);


--
-- Name: restaurant_curations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurant_curations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    kind text NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT restaurant_curations_kind_check CHECK ((kind = ANY (ARRAY['specials'::text, 'new_item'::text, 'featured'::text, 'in_season'::text]))),
    CONSTRAINT restaurant_curations_target_type_check CHECK ((target_type = ANY (ARRAY['card'::text, 'deck'::text])))
);


--
-- Name: restaurants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(200) NOT NULL,
    slug character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    announcements text[] DEFAULT '{}'::text[] NOT NULL
);


--
-- Name: role_deck_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_deck_access (
    role_id uuid NOT NULL,
    deck_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    name text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: student_role_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_role_assignments (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: student_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    restaurant_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: study_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    deck_id uuid,
    cards_studied integer DEFAULT 0,
    correct_answers integer DEFAULT 0,
    average_rating numeric(3,2),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    curation_kind text,
    CONSTRAINT study_sessions_curation_kind_check CHECK ((curation_kind = ANY (ARRAY['specials'::text, 'new_item'::text, 'featured'::text, 'in_season'::text]))),
    CONSTRAINT study_sessions_deck_or_curation CHECK (((deck_id IS NOT NULL) OR (curation_kind IS NOT NULL)))
);


--
-- Name: user_deck_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_deck_access (
    user_id uuid NOT NULL,
    deck_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    restaurant_id uuid NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['student'::character varying, 'management'::character varying])::text[])))
);


--
-- Name: card_reviews card_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_reviews
    ADD CONSTRAINT card_reviews_pkey PRIMARY KEY (id);


--
-- Name: cards cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: decks decks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decks
    ADD CONSTRAINT decks_pkey PRIMARY KEY (id);


--
-- Name: fsrs_cards fsrs_cards_card_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fsrs_cards
    ADD CONSTRAINT fsrs_cards_card_id_user_id_key UNIQUE (card_id, user_id);


--
-- Name: fsrs_cards fsrs_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fsrs_cards
    ADD CONSTRAINT fsrs_cards_pkey PRIMARY KEY (id);


--
-- Name: glossary_categories glossary_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glossary_categories
    ADD CONSTRAINT glossary_categories_pkey PRIMARY KEY (id);


--
-- Name: glossary_categories glossary_categories_restaurant_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glossary_categories
    ADD CONSTRAINT glossary_categories_restaurant_name_key UNIQUE (restaurant_id, name);


--
-- Name: glossary_term_cards glossary_term_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glossary_term_cards
    ADD CONSTRAINT glossary_term_cards_pkey PRIMARY KEY (id);


--
-- Name: glossary_term_cards glossary_term_cards_term_id_card_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glossary_term_cards
    ADD CONSTRAINT glossary_term_cards_term_id_card_id_key UNIQUE (term_id, card_id);


--
-- Name: glossary_terms glossary_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glossary_terms
    ADD CONSTRAINT glossary_terms_pkey PRIMARY KEY (id);


--
-- Name: restaurant_curations restaurant_curations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_curations
    ADD CONSTRAINT restaurant_curations_pkey PRIMARY KEY (id);


--
-- Name: restaurant_curations restaurant_curations_restaurant_id_kind_target_type_target__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_curations
    ADD CONSTRAINT restaurant_curations_restaurant_id_kind_target_type_target__key UNIQUE (restaurant_id, kind, target_type, target_id);


--
-- Name: restaurants restaurants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);


--
-- Name: restaurants restaurants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_slug_key UNIQUE (slug);


--
-- Name: role_deck_access role_deck_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_deck_access
    ADD CONSTRAINT role_deck_access_pkey PRIMARY KEY (role_id, deck_id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (name);


--
-- Name: student_role_assignments student_role_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_role_assignments
    ADD CONSTRAINT student_role_assignments_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: student_roles student_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_roles
    ADD CONSTRAINT student_roles_pkey PRIMARY KEY (id);


--
-- Name: student_roles student_roles_restaurant_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_roles
    ADD CONSTRAINT student_roles_restaurant_id_name_key UNIQUE (restaurant_id, name);


--
-- Name: study_sessions study_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_sessions
    ADD CONSTRAINT study_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_deck_access user_deck_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_deck_access
    ADD CONSTRAINT user_deck_access_pkey PRIMARY KEY (user_id, deck_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_card_reviews_card_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_reviews_card_id ON public.card_reviews USING btree (card_id);


--
-- Name: idx_card_reviews_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_reviews_session_id ON public.card_reviews USING btree (session_id);


--
-- Name: idx_cards_deck_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cards_deck_id ON public.cards USING btree (deck_id);


--
-- Name: idx_cards_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cards_order ON public.cards USING btree (deck_id, card_order);


--
-- Name: idx_cards_restaurant_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cards_restaurant_data ON public.cards USING gin (restaurant_data);


--
-- Name: idx_categories_restaurant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_restaurant_id ON public.categories USING btree (restaurant_id);


--
-- Name: idx_curations_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_curations_lookup ON public.restaurant_curations USING btree (restaurant_id, kind, "position");


--
-- Name: idx_decks_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_decks_category_id ON public.decks USING btree (category_id);


--
-- Name: idx_decks_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_decks_created_by ON public.decks USING btree (created_by);


--
-- Name: idx_decks_restaurant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_decks_restaurant_id ON public.decks USING btree (restaurant_id);


--
-- Name: idx_fsrs_cards_card_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fsrs_cards_card_id ON public.fsrs_cards USING btree (card_id);


--
-- Name: idx_fsrs_cards_next_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fsrs_cards_next_review ON public.fsrs_cards USING btree (next_review);


--
-- Name: idx_fsrs_cards_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fsrs_cards_state ON public.fsrs_cards USING btree (state);


--
-- Name: idx_fsrs_cards_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fsrs_cards_user_id ON public.fsrs_cards USING btree (user_id);


--
-- Name: idx_glossary_categories_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_glossary_categories_created_by ON public.glossary_categories USING btree (created_by);


--
-- Name: idx_glossary_categories_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_glossary_categories_display_order ON public.glossary_categories USING btree (display_order);


--
-- Name: idx_glossary_categories_restaurant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_glossary_categories_restaurant_id ON public.glossary_categories USING btree (restaurant_id);


--
-- Name: idx_glossary_term_cards_card_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_glossary_term_cards_card_id ON public.glossary_term_cards USING btree (card_id);


--
-- Name: idx_glossary_term_cards_term_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_glossary_term_cards_term_id ON public.glossary_term_cards USING btree (term_id);


--
-- Name: idx_glossary_terms_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_glossary_terms_category_id ON public.glossary_terms USING btree (category_id);


--
-- Name: idx_glossary_terms_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_glossary_terms_created_by ON public.glossary_terms USING btree (created_by);


--
-- Name: idx_glossary_terms_restaurant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_glossary_terms_restaurant_id ON public.glossary_terms USING btree (restaurant_id);


--
-- Name: idx_glossary_terms_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_glossary_terms_section ON public.glossary_terms USING btree (section);


--
-- Name: idx_glossary_terms_term; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_glossary_terms_term ON public.glossary_terms USING btree (term);


--
-- Name: idx_glossary_terms_term_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_glossary_terms_term_lower ON public.glossary_terms USING btree (lower((term)::text));


--
-- Name: idx_role_deck_access_deck_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_deck_access_deck_id ON public.role_deck_access USING btree (deck_id);


--
-- Name: idx_student_role_assignments_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_role_assignments_role_id ON public.student_role_assignments USING btree (role_id);


--
-- Name: idx_student_roles_restaurant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_roles_restaurant_id ON public.student_roles USING btree (restaurant_id);


--
-- Name: idx_study_sessions_deck_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_sessions_deck_id ON public.study_sessions USING btree (deck_id);


--
-- Name: idx_study_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_sessions_user_id ON public.study_sessions USING btree (user_id);


--
-- Name: idx_user_deck_access_deck_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_deck_access_deck_id ON public.user_deck_access USING btree (deck_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_restaurant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_restaurant_id ON public.users USING btree (restaurant_id);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: cards update_cards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: decks update_decks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_decks_updated_at BEFORE UPDATE ON public.decks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fsrs_cards update_fsrs_cards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_fsrs_cards_updated_at BEFORE UPDATE ON public.fsrs_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: glossary_categories update_glossary_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_glossary_categories_updated_at BEFORE UPDATE ON public.glossary_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: glossary_terms update_glossary_terms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_glossary_terms_updated_at BEFORE UPDATE ON public.glossary_terms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: restaurants update_restaurants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: student_roles update_student_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_student_roles_updated_at BEFORE UPDATE ON public.student_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: card_reviews card_reviews_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_reviews
    ADD CONSTRAINT card_reviews_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;


--
-- Name: card_reviews card_reviews_fsrs_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_reviews
    ADD CONSTRAINT card_reviews_fsrs_card_id_fkey FOREIGN KEY (fsrs_card_id) REFERENCES public.fsrs_cards(id) ON DELETE CASCADE;


--
-- Name: card_reviews card_reviews_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_reviews
    ADD CONSTRAINT card_reviews_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.study_sessions(id) ON DELETE CASCADE;


--
-- Name: cards cards_deck_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_deck_id_fkey FOREIGN KEY (deck_id) REFERENCES public.decks(id) ON DELETE CASCADE;


--
-- Name: categories categories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: categories categories_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);


--
-- Name: decks decks_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decks
    ADD CONSTRAINT decks_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: decks decks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decks
    ADD CONSTRAINT decks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: decks decks_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decks
    ADD CONSTRAINT decks_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);


--
-- Name: fsrs_cards fsrs_cards_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fsrs_cards
    ADD CONSTRAINT fsrs_cards_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;


--
-- Name: fsrs_cards fsrs_cards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fsrs_cards
    ADD CONSTRAINT fsrs_cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: glossary_categories glossary_categories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glossary_categories
    ADD CONSTRAINT glossary_categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: glossary_categories glossary_categories_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glossary_categories
    ADD CONSTRAINT glossary_categories_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);


--
-- Name: glossary_term_cards glossary_term_cards_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glossary_term_cards
    ADD CONSTRAINT glossary_term_cards_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;


--
-- Name: glossary_term_cards glossary_term_cards_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glossary_term_cards
    ADD CONSTRAINT glossary_term_cards_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.glossary_terms(id) ON DELETE CASCADE;


--
-- Name: glossary_terms glossary_terms_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glossary_terms
    ADD CONSTRAINT glossary_terms_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.glossary_categories(id) ON DELETE SET NULL;


--
-- Name: glossary_terms glossary_terms_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glossary_terms
    ADD CONSTRAINT glossary_terms_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: glossary_terms glossary_terms_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.glossary_terms
    ADD CONSTRAINT glossary_terms_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);


--
-- Name: restaurant_curations restaurant_curations_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_curations
    ADD CONSTRAINT restaurant_curations_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: role_deck_access role_deck_access_deck_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_deck_access
    ADD CONSTRAINT role_deck_access_deck_id_fkey FOREIGN KEY (deck_id) REFERENCES public.decks(id) ON DELETE CASCADE;


--
-- Name: role_deck_access role_deck_access_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_deck_access
    ADD CONSTRAINT role_deck_access_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.student_roles(id) ON DELETE CASCADE;


--
-- Name: student_role_assignments student_role_assignments_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_role_assignments
    ADD CONSTRAINT student_role_assignments_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.student_roles(id) ON DELETE CASCADE;


--
-- Name: student_role_assignments student_role_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_role_assignments
    ADD CONSTRAINT student_role_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_roles student_roles_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_roles
    ADD CONSTRAINT student_roles_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: study_sessions study_sessions_deck_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_sessions
    ADD CONSTRAINT study_sessions_deck_id_fkey FOREIGN KEY (deck_id) REFERENCES public.decks(id) ON DELETE CASCADE;


--
-- Name: study_sessions study_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_sessions
    ADD CONSTRAINT study_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_deck_access user_deck_access_deck_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_deck_access
    ADD CONSTRAINT user_deck_access_deck_id_fkey FOREIGN KEY (deck_id) REFERENCES public.decks(id) ON DELETE CASCADE;


--
-- Name: user_deck_access user_deck_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_deck_access
    ADD CONSTRAINT user_deck_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 7Gp9LBn5jhYicfkJ67LtBNIcIrWEMVPpbG6rL4Sw2d3T40JuO2Quj9XTEztssDS


--
-- Mark all migrations folded into this baseline as applied.
--

INSERT INTO public.schema_migrations (name) VALUES
    ('001_add_restaurant_data.sql'),
    ('002_remove_image_focus_points.sql'),
    ('003_add_glossary_tables.sql'),
    ('004_add_glossary_section.sql'),
    ('005_add_study_sessions_timestamps.sql'),
    ('008_add_restaurants_multitenancy.sql'),
    ('009_add_bulletin.sql'),
    ('010_rename_in_season.sql'),
    ('011_nullable_session_deck.sql'),
    ('012_add_student_roles_and_deck_access.sql'),
    ('013_add_deck_featured_order.sql'),
    ('014_drop_deck_featured.sql'),
    ('015_add_deck_type.sql'),
    ('016_widen_fsrs_stability.sql');
