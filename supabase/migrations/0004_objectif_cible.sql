-- ============================================================================
-- Migration 0004 : Objectif chiffre + intention
-- ----------------------------------------------------------------------------
-- Ajoute la notion de poids cible (mesurable) et d'intention (motivationnelle)
-- pour permettre :
--   * la bascule automatique perte/prise -> maintien quand l'objectif est atteint
--   * un modal de celebration "objectif atteint" affiche une seule fois
--   * des messages personnalises selon l'intention (bien-etre / silhouette / tonique)
-- ============================================================================

ALTER TABLE profiles
  -- Poids cible en kg (NULL = pas de cible precise, l'utilisateur veut juste
  -- perdre/prendre sans point d'arrivee defini)
  ADD COLUMN IF NOT EXISTS poids_objectif NUMERIC(5,2),

  -- Date a laquelle l'utilisateur est entre dans la zone "objectif atteint"
  -- (poids actuel dans la marge +/- 1 kg autour de la cible). Sert a
  -- n'afficher le modal de celebration qu'une seule fois.
  ADD COLUMN IF NOT EXISTS objectif_atteint_le DATE,

  -- Intention motivationnelle pour personnaliser les messages et detecter
  -- les incoherences (ex : "tonique" sans aucune musculation declaree).
  ADD COLUMN IF NOT EXISTS intention TEXT
    CHECK (intention IN ('bien_etre', 'silhouette', 'tonique'));

-- (Aucune valeur par defaut : les profils existants resteront NULL et seront
-- consideres comme "pas de cible". Aucun risque de regression.)
