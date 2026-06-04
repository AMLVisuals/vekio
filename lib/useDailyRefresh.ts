import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';

/**
 * Gere le rafraichissement des ecrans de donnees journalieres.
 *
 *  - `onFocus`      : rejoue a chaque fois que l'onglet (re)gagne le focus
 *                     (inclut le premier montage). Sert a recharger la
 *                     journee actuellement affichee.
 *  - `onForeground` : rejoue quand l'app revient au premier plan apres un
 *                     passage en arriere-plan. Sert a revenir « aujourd'hui »
 *                     a la reouverture, comme MyFitnessPal — sinon, une app
 *                     restee ouverte jusqu'au lendemain continuerait
 *                     d'afficher la veille.
 *
 * Si `onForeground` n'est pas fourni, on rejoue simplement `onFocus`.
 */
export function useDailyRefresh(onFocus: () => void, onForeground?: () => void) {
  // On garde les dernieres versions sans relancer les listeners.
  const focusRef = useRef(onFocus);
  focusRef.current = onFocus;
  const fgRef = useRef(onForeground);
  fgRef.current = onForeground;

  useFocusEffect(
    useCallback(() => {
      focusRef.current();
    }, [])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') return;
      (fgRef.current ?? focusRef.current)();
    });
    return () => sub.remove();
  }, []);
}
