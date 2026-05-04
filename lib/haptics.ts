// =============================================================================
// Wrapper expo-haptics — tolerant aux plateformes sans support
// =============================================================================
// Tous les appels sont silencieusement no-op si haptics n'est pas dispo
// (web, certains anciens devices). Pas besoin de try/catch dans les ecrans.

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptic = {
  // Tap leger — selection, tick de picker
  light: () => {
    if (!supported) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  // Confirmation moderee — bouton primaire, validation
  medium: () => {
    if (!supported) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  // Choc fort — moment marquant (objectif atteint)
  heavy: () => {
    if (!supported) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  // Succes — pesee enregistree, action accomplie
  success: () => {
    if (!supported) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  // Avertissement
  warning: () => {
    if (!supported) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
  // Erreur
  error: () => {
    if (!supported) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
  // Selection — utile pour ScrollPicker (tick a chaque cran)
  selection: () => {
    if (!supported) return;
    Haptics.selectionAsync().catch(() => {});
  },
};
