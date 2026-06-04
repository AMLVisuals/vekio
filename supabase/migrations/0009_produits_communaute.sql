-- ============================================================================
-- Migration 0009 : base communautaire de produits (facon MyFitnessPal)
-- A executer dans le SQL Editor du dashboard Supabase (BON projet : mwbrw...)
-- ============================================================================
-- Quand un utilisateur saisit a la main un produit absent d'Open Food Facts
-- (whey, gainers, barres...), on le partage ici avec TOUS les utilisateurs.
-- Resultat : le 1er qui scanne une whey la saisit une fois -> tous les suivants
-- la trouvent instantanement. La base se remplit toute seule avec le temps.
--
-- Valeurs stockees POUR 100 g (comme NutritionData). Cle = code-barres (partage,
-- pas par utilisateur). `created_by` garde qui a contribue (attribution / moderation).
-- ============================================================================

CREATE TABLE IF NOT EXISTS produits_communaute (
  code           TEXT PRIMARY KEY,
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
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE produits_communaute ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur connecte peut consulter la base partagee.
CREATE POLICY "communaute_select_auth" ON produits_communaute FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Ajout : un utilisateur connecte peut contribuer, en se declarant comme auteur.
-- Pas de policy UPDATE/DELETE volontairement : on n'ecrase ni ne supprime la
-- contribution d'un autre (anti-vandalisme). Le 1er a saisir fait foi ; chacun
-- garde de toute facon sa propre version exacte dans `produits_perso`.
CREATE POLICY "communaute_insert_auth" ON produits_communaute FOR INSERT
  WITH CHECK (auth.uid() = created_by);
