import { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useJournalStore } from '../../stores/journalStore';
import { useUserStore } from '../../stores/userStore';
import { useHydratationStore } from '../../stores/hydratationStore';
import { colors, spacing, radius, shadow, palette } from '../../theme/tokens';
import { haptic } from '../../lib/haptics';

const GLASS_ML = 250;

function getProgressColor(ratio: number): string {
  if (ratio < 0.9) return colors.success;
  if (ratio <= 1.1) return colors.warning;
  return colors.error;
}

export default function DashboardScreen() {
  const theme = useTheme();
  const { entries, loadFromSupabase } = useJournalStore();
  const profile = useUserStore((s) => s.profile);
  const macros = useUserStore((s) => s.macros);
  const { totalMl, objectifMl, loadToday, addWater, removeWater } = useHydratationStore();

  useEffect(() => {
    loadFromSupabase();
    loadToday();
  }, []);

  const totalCal = entries.reduce((sum, e) => sum + e.calories, 0);
  const totalProt = entries.reduce((sum, e) => sum + e.proteines, 0);
  const totalGluc = entries.reduce((sum, e) => sum + e.glucides, 0);
  const totalLip = entries.reduce((sum, e) => sum + e.lipides, 0);

  const calTarget = macros?.calories ?? 2000;
  const calRatio = totalCal / calTarget;
  const remaining = Math.max(calTarget - Math.round(totalCal), 0);

  const totalGlasses = Math.ceil(objectifMl / GLASS_ML);
  const filledGlasses = Math.floor(totalMl / GLASS_ML);
  const hydroPct = Math.min(100, Math.round((totalMl / objectifMl) * 100));

  const handleAddWater = () => { haptic.light(); addWater(GLASS_ML); };
  const handleRemoveWater = () => { haptic.light(); removeWater(GLASS_ML); };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text variant="headlineLarge" style={styles.greeting}>
            {profile?.nom ? `Salut ${profile.nom}` : 'Vekio'}
          </Text>
          <Text variant="bodyMedium" style={styles.date}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </Animated.View>

        {/* Anneau calories */}
        <Animated.View entering={FadeInDown.duration(450).delay(80)} style={styles.gaugeContainer}>
          <CalorieGauge
            current={Math.round(totalCal)}
            target={calTarget}
            remaining={remaining}
            color={getProgressColor(calRatio)}
          />
        </Animated.View>

        {/* Macros */}
        <Animated.View entering={FadeInDown.duration(450).delay(160)}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Macros du jour</Text>
          <View style={styles.macrosContainer}>
            <MacroBar
              label="Protéines"
              current={Math.round(totalProt)}
              target={macros?.proteines_g ?? 0}
              color={colors.macroProteine}
            />
            <MacroBar
              label="Glucides"
              current={Math.round(totalGluc)}
              target={macros?.glucides_g ?? 0}
              color={colors.macroGlucide}
            />
            <MacroBar
              label="Lipides"
              current={Math.round(totalLip)}
              target={macros?.lipides_g ?? 0}
              color={colors.macroLipide}
            />
          </View>
        </Animated.View>

        {/* Hydratation */}
        <Animated.View entering={FadeInDown.duration(450).delay(240)} style={styles.hydratationCard}>
          <View style={styles.hydratationHeader}>
            <View>
              <Text variant="titleMedium" style={styles.hydratationTitle}>Hydratation</Text>
              <Text variant="bodySmall" style={styles.hydratationSubtitle}>
                {totalMl} / {objectifMl} ml · {hydroPct}%
              </Text>
            </View>
            <View style={styles.hydratationActions}>
              <Pressable
                onPress={handleRemoveWater}
                style={[styles.hydratationBtn, { backgroundColor: colors.surfaceVariant }]}
              >
                <Text variant="titleLarge" style={{ color: colors.text, lineHeight: 24 }}>−</Text>
              </Pressable>
              <Pressable
                onPress={handleAddWater}
                style={[styles.hydratationBtn, { backgroundColor: palette.primary500 }]}
              >
                <Text variant="titleLarge" style={{ color: '#FFF', lineHeight: 24 }}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.glassesRow}>
            {Array.from({ length: totalGlasses }, (_, i) => {
              const isFilled = i < filledGlasses;
              return (
                <Pressable
                  key={i}
                  onPress={() => {
                    haptic.light();
                    if (isFilled && i === filledGlasses - 1) removeWater(GLASS_ML);
                    else if (!isFilled && i === filledGlasses) addWater(GLASS_ML);
                  }}
                  style={[
                    styles.glass,
                    {
                      backgroundColor: isFilled ? colors.water : 'transparent',
                      borderColor: isFilled ? colors.water : palette.neutral300,
                    },
                  ]}
                />
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CalorieGauge({ current, target, remaining, color }: { current: number; target: number; remaining: number; color: string }) {
  const size = 200;
  const strokeWidth = 16;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(current / target, 1);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={palette.neutral200}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.gaugeText}>
        <Text variant="displaySmall" style={{ color: colors.text, fontFamily: 'Inter_700Bold' }}>
          {current}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted, marginTop: 2 }}>
          / {target} kcal
        </Text>
        <Text variant="labelMedium" style={{ color, marginTop: spacing.xs }}>
          {remaining > 0 ? `${remaining} restantes` : 'Objectif atteint'}
        </Text>
      </View>
    </View>
  );
}

function MacroBar({ label, current, target, color }: {
  label: string; current: number; target: number; color: string;
}) {
  const ratio = target > 0 ? current / target : 0;
  const progressWidth = `${Math.min(ratio * 100, 100)}%`;

  return (
    <View style={styles.macroBarContainer}>
      <View style={styles.macroBarHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <Text variant="bodyMedium" style={{ color: colors.text }}>{label}</Text>
        </View>
        <Text variant="labelLarge" style={{ color: colors.text }}>
          {current}<Text style={{ color: colors.textMuted }}> / {target} g</Text>
        </Text>
      </View>
      <View style={styles.macroBarBg}>
        <View style={[styles.macroBarFill, { width: progressWidth as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  greeting: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
  },
  date: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing['2xl'],
    textTransform: 'capitalize',
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  gaugeText: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    color: colors.text,
    marginBottom: spacing.md,
  },
  macrosContainer: {
    gap: spacing.lg,
    marginBottom: spacing['3xl'],
  },
  macroBarContainer: {
    gap: spacing.sm,
  },
  macroBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroBarBg: {
    height: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceVariant,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: radius.sm,
  },
  hydratationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.card,
  },
  hydratationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  hydratationTitle: { color: colors.text },
  hydratationSubtitle: { color: colors.textMuted, marginTop: 2 },
  hydratationActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hydratationBtn: {
    width: 40, height: 40,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  glass: {
    width: 24,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 2,
  },
});
