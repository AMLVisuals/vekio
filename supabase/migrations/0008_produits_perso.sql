-- ============================================================================
-- Migration 0008 : produits personnels scannes (fallback code-barres)
-- A executer dans le SQL Editor du dashboard Supabase
-- ============================================================================
-- Quand un code-barres n'est pas trouve dans Open Food Facts (frequent pour les
-- produits sport : whey, gainers, barres...), l'utilisateur saisit les macros a
-- la main. On les memorise ici, indexees par code-barres, pour qu'un 2e scan du
-- meme produit le retrouve instantanement sans ressaisie.
--
-- Les valeurs sont stockees POUR 100 g (comme NutritionData cote app), pas pour
-- la portion. Cle primaire (user_id, code) => upsert lors d'un re-scan.
-- ============================================================================

CREATE TABLE IF NOT EXISTS produits_perso (
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code           TEXT NOT NULL,
  nom            TEXT NOT NULL,
  brand          TEXT NOT NULL DEFAULT '',
  calories       INT NOT NULL DEFAULT 0,
  proteines_g    NUMERIC(6,1) NOT NULL DEFAULT 0,
  glucides_g     NUMERIC(6,1) NOT NULL DEFAULT 0,
  lipides_g      NUMERIC(6,1) NOT NULL DEFAULT 0,
  -- micronutriments optionnels (pour 100 g), NULL si non renseignes
  fibres_g       NUMERIC(6,1),
  sucres_g       NUMERIC(6,1),
  ags_g          NUMERIC(6,1),
  cholesterol_mg NUMERIC(7,1),
  sodium_mg      NUMERIC(7,1),
  calcium_mg     NUMERIC(7,1),
  fer_mg         NUMERIC(5,1),
  potassium_mg   NUMERIC(7,1),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, code)
);

ALTER TABLE produits_perso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produits_perso_select_own" ON produits_perso FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "produits_perso_insert_own" ON produits_perso FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "produits_perso_update_own" ON produits_perso FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "produits_perso_delete_own" ON produits_perso FOR DELETE
  USING (auth.uid() = user_id);
