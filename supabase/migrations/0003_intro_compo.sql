-- ============================================================================
-- Migration 0003 : Pop-ups d'introduction par onglet + composition corporelle
-- a remplir manuellement
-- ============================================================================

-- Stockage des onglets vus (pour ne pas re-afficher le pop-up d'intro)
-- Format : { "stats": true, "journal": true, ... }
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS intro_seen JSONB DEFAULT '{}'::JSONB;

-- (Les colonnes masse_grasse_pct, masse_musculaire_pct, masse_hydrique_pct
-- existent deja dans profiles via la migration 0002.)

-- Pour faciliter la requete "premiere pesee" et "derniere pesee" :
CREATE INDEX IF NOT EXISTS idx_poids_user_date ON poids_historique(user_id, date);
