-- ============================================================================
-- Migration 0007 : cycle menstruel
-- ============================================================================
-- Permet aux utilisatrices d'activer le suivi de leur cycle pour ajuster les
-- besoins caloriques en phase luteale (+150 kcal/j, consensus etudes).
-- Stocke seulement 3 infos minimales — pas de prediction medicale.
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cycle_actif            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cycle_dernieres_regles DATE,
  ADD COLUMN IF NOT EXISTS cycle_duree_jours      INT NOT NULL DEFAULT 28
    CHECK (cycle_duree_jours >= 21 AND cycle_duree_jours <= 40);
