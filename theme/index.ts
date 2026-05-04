// =============================================================================
// Theme React Native Paper custom Vekio
// =============================================================================
// On etend MD3LightTheme en ecrasant la palette de couleurs et la typographie.
// Tous les composants Paper (Card, Button, TextInput, Text...) recuperent ces
// valeurs automatiquement via useTheme(), donc on n'a pas a les passer
// explicitement.

import { MD3LightTheme, configureFonts, type MD3Theme } from 'react-native-paper';
import { colors, palette, typography } from './tokens';

// Adapter notre echelle typographique au format attendu par Paper.
const fontConfig = {
  displayLarge:   { ...typography.displayLarge,   fontWeight: '700' as const },
  displayMedium:  { ...typography.displayMedium,  fontWeight: '700' as const },
  displaySmall:   { ...typography.displaySmall,   fontWeight: '700' as const },
  headlineLarge:  { ...typography.headlineLarge,  fontWeight: '700' as const },
  headlineMedium: { ...typography.headlineMedium, fontWeight: '700' as const },
  headlineSmall:  { ...typography.headlineSmall,  fontWeight: '600' as const },
  titleLarge:     { ...typography.titleLarge,     fontWeight: '600' as const },
  titleMedium:    { ...typography.titleMedium,    fontWeight: '600' as const },
  titleSmall:     { ...typography.titleSmall,     fontWeight: '600' as const },
  bodyLarge:      { ...typography.bodyLarge,      fontWeight: '400' as const },
  bodyMedium:     { ...typography.bodyMedium,     fontWeight: '400' as const },
  bodySmall:      { ...typography.bodySmall,      fontWeight: '400' as const },
  labelLarge:     { ...typography.labelLarge,     fontWeight: '500' as const },
  labelMedium:    { ...typography.labelMedium,    fontWeight: '500' as const },
  labelSmall:     { ...typography.labelSmall,     fontWeight: '500' as const },
};

export const vekioTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 4, // facteur de base, on override avec radius.* dans les composants critiques
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary:            colors.primary,
    onPrimary:          colors.onPrimary,
    primaryContainer:   colors.primaryContainer,
    onPrimaryContainer: colors.onPrimaryContainer,

    secondary:            palette.primary600,
    onSecondary:          colors.onPrimary,
    secondaryContainer:   palette.primary50,
    onSecondaryContainer: palette.primary800,

    tertiary:            palette.glucide,
    onTertiary:          '#FFFFFF',
    tertiaryContainer:   '#FEF3C7',
    onTertiaryContainer: '#92400E',

    error:           colors.error,
    errorContainer:  '#FEE2E2',
    onError:         '#FFFFFF',
    onErrorContainer: '#991B1B',

    background:    colors.background,
    onBackground:  colors.text,
    surface:       colors.surface,
    onSurface:     colors.text,
    surfaceVariant: colors.surfaceVariant,
    onSurfaceVariant: colors.textSecondary,
    surfaceDisabled: palette.neutral200,
    onSurfaceDisabled: palette.neutral400,

    outline:        colors.border,
    outlineVariant: palette.neutral200,

    inverseSurface:   palette.neutral800,
    inverseOnSurface: palette.neutral50,
    inversePrimary:   palette.primary300,

    backdrop: 'rgba(15, 17, 15, 0.4)',
  },
};
