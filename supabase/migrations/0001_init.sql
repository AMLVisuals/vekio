-- ============================================================================
-- Migration 0001 : Schema complet Vekio + RLS
-- A executer dans le SQL Editor du dashboard Supabase
-- ============================================================================

-- ============================================================================
-- Table : profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT,
  age INT,
  poids NUMERIC(5,2),
  taille NUMERIC(5,2),
  sexe TEXT CHECK (sexe IN ('homme', 'femme')),
  activite TEXT CHECK (activite IN ('sedentaire', 'leger', 'modere', 'actif', 'tres_actif')),
  objectif TEXT CHECK (objectif IN ('perte', 'maintien', 'prise')),
  is_pro BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Table : objectifs_macros
-- ============================================================================
CREATE TABLE IF NOT EXISTS objectifs_macros (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  calories INT NOT NULL,
  proteines_g NUMERIC(6,1) NOT NULL,
  glucides_g NUMERIC(6,1) NOT NULL,
  lipides_g NUMERIC(6,1) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE objectifs_macros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "macros_select_own" ON objectifs_macros FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "macros_insert_own" ON objectifs_macros FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "macros_update_own" ON objectifs_macros FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "macros_delete_own" ON objectifs_macros FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Table : journal (entrees alimentaires quotidiennes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS journal (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  repas TEXT NOT NULL CHECK (repas IN ('petit_dejeuner', 'dejeuner', 'diner', 'collation')),
  food_id TEXT,
  nom TEXT NOT NULL,
  quantite_g NUMERIC(7,1) NOT NULL,
  calories INT NOT NULL,
  proteines_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  glucides_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  lipides_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal(user_id, date);

ALTER TABLE journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_select_own" ON journal FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "journal_insert_own" ON journal FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_update_own" ON journal FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "journal_delete_own" ON journal FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Table : aliments_favoris (memorise la frequence d'utilisation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS aliments_favoris (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_id TEXT,
  nom TEXT NOT NULL,
  calories INT NOT NULL,
  proteines_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  glucides_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  lipides_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  nb_utilisations INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_favoris_user_freq ON aliments_favoris(user_id, nb_utilisations DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_favoris_user_nom ON aliments_favoris(user_id, nom);

ALTER TABLE aliments_favoris ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favoris_select_own" ON aliments_favoris FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "favoris_insert_own" ON aliments_favoris FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favoris_update_own" ON aliments_favoris FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "favoris_delete_own" ON aliments_favoris FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Table : menus (avec photo + aliments en JSON)
-- ============================================================================
CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  photo_url TEXT,
  aliments_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  total_calories INT NOT NULL DEFAULT 0,
  total_proteines NUMERIC(6,1) NOT NULL DEFAULT 0,
  total_glucides NUMERIC(6,1) NOT NULL DEFAULT 0,
  total_lipides NUMERIC(6,1) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menus_user ON menus(user_id, created_at DESC);

ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menus_select_own" ON menus FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "menus_insert_own" ON menus FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "menus_update_own" ON menus FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "menus_delete_own" ON menus FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Table : poids_historique
-- ============================================================================
CREATE TABLE IF NOT EXISTS poids_historique (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  poids_kg NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

ALTER TABLE poids_historique ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poids_select_own" ON poids_historique FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "poids_insert_own" ON poids_historique FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "poids_update_own" ON poids_historique FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "poids_delete_own" ON poids_historique FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Table : hydratation (suivi quotidien d'eau)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hydratation (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_ml INT NOT NULL DEFAULT 0,
  objectif_ml INT NOT NULL DEFAULT 2000,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

ALTER TABLE hydratation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hydratation_select_own" ON hydratation FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "hydratation_insert_own" ON hydratation FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hydratation_update_own" ON hydratation FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "hydratation_delete_own" ON hydratation FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Storage : bucket "menu-photos" (a creer manuellement dans le dashboard
--   ou via le SQL ci-dessous selon les permissions)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-photos', 'menu-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies storage : un user peut uploader/lire ses propres photos
CREATE POLICY "menu_photos_insert_own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'menu-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "menu_photos_select_public" ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-photos');
CREATE POLICY "menu_photos_update_own" ON storage.objects FOR UPDATE
  USING (bucket_id = 'menu-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "menu_photos_delete_own" ON storage.objects FOR DELETE
  USING (bucket_id = 'menu-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
