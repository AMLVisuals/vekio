-- ============================================================================
-- Migration 0002 : Refonte onboarding v2
-- Ajoute les champs pour la nouvelle logique de calcul (vitesse, sports
-- multi, date de naissance, masse grasse, parametres pesee hebdo).
-- A executer dans le SQL Editor du dashboard Supabase.
-- ============================================================================

-- profiles : nouveaux champs
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_naissance DATE,
  ADD COLUMN IF NOT EXISTS vitesse_kg_semaine NUMERIC(3,2) DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS sports JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS masse_grasse_pct NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS masse_musculaire_pct NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS masse_hydrique_pct NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS health_connected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS jour_pesee_hebdo INT DEFAULT 0 CHECK (jour_pesee_hebdo BETWEEN 0 AND 6),
  ADD COLUMN IF NOT EXISTS heure_notification_pesee TIME DEFAULT '09:00';

-- objectifs_macros : flag pour savoir si calcul base sur masse maigre
ALTER TABLE objectifs_macros
  ADD COLUMN IF NOT EXISTS calculees_sur_masse_maigre BOOLEAN DEFAULT FALSE;

-- poids_historique : enrichi avec composition corporelle + source
ALTER TABLE poids_historique
  ADD COLUMN IF NOT EXISTS masse_grasse_pct NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS masse_musculaire_pct NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS masse_hydrique_pct NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manuel' CHECK (source IN ('manuel', 'health'));

-- L'ancienne colonne `activite` (text) reste pour compat ; les nouvelles
-- valeurs sont stockees dans sports (JSONB). On ne la supprime pas pour ne
-- pas casser les anciens profils.

-- L'ancienne colonne `age` (int) reste aussi : elle sera derivee de
-- date_naissance pour les nouveaux profils.
