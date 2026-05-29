-- ============================================================================
-- Migration 0006 : ajout des 8 micronutriments
-- ============================================================================
-- Ajoute fibres, sucres totaux, AG satures, cholesterol, sodium, calcium, fer,
-- potassium sur les 4 tables qui stockent des donnees nutritionnelles. Toutes
-- les colonnes sont NULLABLE / DEFAULT 0 pour rester compatibles avec
-- l'existant (aucune migration de donnees necessaire).
-- ============================================================================

-- objectifs_macros : objectifs journaliers (peuvent etre NULL si non calcules)
ALTER TABLE objectifs_macros
  ADD COLUMN IF NOT EXISTS fibres_g       NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS sucres_g       NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS ags_g          NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS cholesterol_mg INT,
  ADD COLUMN IF NOT EXISTS sodium_mg      INT,
  ADD COLUMN IF NOT EXISTS calcium_mg     INT,
  ADD COLUMN IF NOT EXISTS fer_mg         NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS potassium_mg   INT;

-- journal : valeurs par entree alimentaire
ALTER TABLE journal
  ADD COLUMN IF NOT EXISTS fibres_g       NUMERIC(6,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sucres_g       NUMERIC(6,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ags_g          NUMERIC(6,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cholesterol_mg NUMERIC(7,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sodium_mg      NUMERIC(7,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calcium_mg     NUMERIC(7,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fer_mg         NUMERIC(5,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS potassium_mg   NUMERIC(7,1) DEFAULT 0;

-- aliments_favoris : pour pre-remplir lors de la re-utilisation
ALTER TABLE aliments_favoris
  ADD COLUMN IF NOT EXISTS fibres_g       NUMERIC(6,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sucres_g       NUMERIC(6,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ags_g          NUMERIC(6,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cholesterol_mg NUMERIC(7,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sodium_mg      NUMERIC(7,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calcium_mg     NUMERIC(7,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fer_mg         NUMERIC(5,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS potassium_mg   NUMERIC(7,1) DEFAULT 0;

-- menus : totaux pour affichage rapide (les details par aliment restent dans aliments_json)
ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS total_fibres       NUMERIC(6,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sucres       NUMERIC(6,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ags          NUMERIC(6,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cholesterol  NUMERIC(7,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sodium       NUMERIC(7,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_calcium      NUMERIC(7,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_fer          NUMERIC(5,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_potassium    NUMERIC(7,1) DEFAULT 0;
