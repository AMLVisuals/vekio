// =============================================================================
// Tokens design Vekio
// =============================================================================
// Source unique de verite pour palette, espacements, radius et typographie.
// Tout le reste (theme Paper, composants custom, styles inline) doit
// reutiliser ces valeurs — jamais de hex code en dur dans les ecrans.

// -----------------------------------------------------------------------------
// Palette
// -----------------------------------------------------------------------------
// Direction "Vekio frais" : blanc + accent vert vif (emerald), neutres chauds
// avec une legere teinte verte pour ne pas avoir l'impression de gris froid.
// =============================================================================
export const palette = {
  // Primary : emerald (Tailwind-like) — energique mais pas criard
  primary50:  '#ECFDF5',
  primary100: '#D1FAE5',
  primary200: '#A7F3D0',
  primary300: '#6EE7B7',
  primary400: '#34D399',
  primary500: '#10B981', // accent principal Vekio
  primary600: '#059669',
  primary700: '#047857',
  primary800: '#065F46',
  primary900: '#064E3B',

  // Neutres : tres legere teinte verte/chaude pour un blanc moins clinique
  neutral0:   '#FFFFFF',
  neutral50:  '#FAFBFA', // background app
  neutral100: '#F4F6F4', // surface variant
  neutral200: '#E8ECE9',
  neutral300: '#D4D9D5',
  neutral400: '#A8AFA9',
  neutral500: '#7A817B',
  neutral600: '#525751',
  neutral700: '#383C39',
  neutral800: '#1F231F',
  neutral900: '#0F110F',

  // Macros — choisies pour bonne distinction visuelle
  proteine:  '#10B981', // vert (aligne sur primary)
  glucide:   '#F59E0B', // amber
  lipide:    '#3B82F6', // blue
  calorie:   '#0F110F', // dark neutral pour le hero

  // Hydratation
  water:     '#0EA5E9', // sky-500

  // Semantiques
  success:   '#10B981',
  warning:   '#F59E0B',
  error:     '#EF4444',
  info:      '#3B82F6',
} as const;

// -----------------------------------------------------------------------------
// Roles semantiques (consommation directe par les ecrans)
// -----------------------------------------------------------------------------
// Permet de changer la palette sans toucher aux ecrans.
export const colors = {
  background:        palette.neutral50,
  surface:           palette.neutral0,
  surfaceVariant:    palette.neutral100,
  surfaceElevated:   palette.neutral0,
  primary:           palette.primary500,
  primaryContainer:  palette.primary100,
  onPrimary:         palette.neutral0,
  onPrimaryContainer: palette.primary800,
  text:              palette.neutral900,
  textSecondary:     palette.neutral600,
  textMuted:         palette.neutral500,
  border:            palette.neutral200,
  borderStrong:      palette.neutral300,

  macroProteine: palette.proteine,
  macroGlucide:  palette.glucide,
  macroLipide:   palette.lipide,
  calorie:       palette.calorie,
  water:         palette.water,

  success: palette.success,
  warning: palette.warning,
  error:   palette.error,
  info:    palette.info,
} as const;

// -----------------------------------------------------------------------------
// Espacements — base 4
// -----------------------------------------------------------------------------
export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
} as const;

// -----------------------------------------------------------------------------
// Radius
// -----------------------------------------------------------------------------
export const radius = {
  sm:    8,
  md:    12,
  lg:    16,  // cartes secondaires
  xl:    20,  // cartes principales
  '2xl': 24,  // modaux, cartes hero
  '3xl': 32,
  full:  999,
} as const;

// -----------------------------------------------------------------------------
// Typographie — Inter
// -----------------------------------------------------------------------------
// Familles disponibles apres chargement (cf theme/index.ts useFonts).
export const fontFamily = {
  regular:  'Inter_400Regular',
  medium:   'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold:     'Inter_700Bold',
} as const;

// Echelle de tailles + line height (en px) + weight conseille
// On suit le naming Material 3 pour la compatibilite avec Paper.
export const typography = {
  displayLarge:   { fontFamily: fontFamily.bold,     fontSize: 36, lineHeight: 44, letterSpacing: -0.5 },
  displayMedium:  { fontFamily: fontFamily.bold,     fontSize: 30, lineHeight: 38, letterSpacing: -0.4 },
  displaySmall:   { fontFamily: fontFamily.bold,     fontSize: 26, lineHeight: 34, letterSpacing: -0.3 },
  headlineLarge:  { fontFamily: fontFamily.bold,     fontSize: 24, lineHeight: 32, letterSpacing: -0.2 },
  headlineMedium: { fontFamily: fontFamily.bold,     fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  headlineSmall:  { fontFamily: fontFamily.semibold, fontSize: 20, lineHeight: 28, letterSpacing: -0.1 },
  titleLarge:     { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 24, letterSpacing: 0 },
  titleMedium:    { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 22, letterSpacing: 0 },
  titleSmall:     { fontFamily: fontFamily.semibold, fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  bodyLarge:      { fontFamily: fontFamily.regular,  fontSize: 16, lineHeight: 24, letterSpacing: 0.15 },
  bodyMedium:     { fontFamily: fontFamily.regular,  fontSize: 14, lineHeight: 20, letterSpacing: 0.15 },
  bodySmall:      { fontFamily: fontFamily.regular,  fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  labelLarge:     { fontFamily: fontFamily.medium,   fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  labelMedium:    { fontFamily: fontFamily.medium,   fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  labelSmall:     { fontFamily: fontFamily.medium,   fontSize: 11, lineHeight: 16, letterSpacing: 0.5 },
} as const;

// -----------------------------------------------------------------------------
// Ombres — utiliser avec parcimonie (style Welmi : tres subtiles)
// -----------------------------------------------------------------------------
export const shadow = {
  // Ombre de carte legere (eleve d'1 cran sans l'effet "carte qui plane")
  card: {
    shadowColor: palette.neutral900,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  // Ombre prononcee pour les modaux/sheets
  modal: {
    shadowColor: palette.neutral900,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;
