-- ============================================================================
-- Migration 0005 : mode auto / manuel pour les objectifs macros
-- ============================================================================
-- Quand l'utilisateur personnalise ses macros dans Profil, on passe en 'manuel'
-- et le recalcul automatique apres pesee ne touche plus aux valeurs. Quand il
-- clique "Recalculer selon mon profil", on repasse en 'auto'.
-- ============================================================================

ALTER TABLE objectifs_macros
  ADD COLUMN IF NOT EXISTS macros_mode TEXT NOT NULL DEFAULT 'auto'
  CHECK (macros_mode IN ('auto', 'manuel'));
