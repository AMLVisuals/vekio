// =============================================================================
// useIntroPopup — hook reutilisable pour les pop-ups d'intro par onglet
// =============================================================================
// Affiche automatiquement le pop-up la premiere fois qu'on visite un onglet
// (basé sur profile.intro_seen[tab]) et permet de le rouvrir manuellement
// via un bouton info.

import { useEffect, useState } from 'react';
import { useUserStore } from '../stores/userStore';

export function useIntroPopup(tab: string) {
  const profile = useUserStore((s) => s.profile);
  const markIntroSeen = useUserStore((s) => s.markIntroSeen);

  const [visible, setVisible] = useState(false);

  // Auto-affichage premiere visite
  useEffect(() => {
    if (profile && !profile.intro_seen?.[tab]) {
      setVisible(true);
    }
  }, [profile?.id, tab]);

  return {
    visible,
    open: () => setVisible(true),
    close: async () => {
      setVisible(false);
      // Marque comme vu uniquement si pas deja vu (evite ecriture inutile)
      if (profile && !profile.intro_seen?.[tab]) {
        await markIntroSeen(tab);
      }
    },
  };
}
