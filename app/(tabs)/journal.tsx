import { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useJournalStore, MEAL_LABELS, type MealType, type JournalEntry } from '../../stores/journalStore';
import { useUserStore } from '../../stores/userStore';
import { colors, spacing, radius, shadow, palette } from '../../theme/tokens';
import { haptic } from '../../lib/haptics';

const MEALS: MealType[] = ['petit_dejeuner', 'dejeuner', 'diner', 'collation'];
const MEAL_EMOJI: Record<MealType, string> = {
  petit_dejeuner: '🥐',
  dejeuner: '🥗',
  diner: '🍽️',
  collation: '🍎',
};

export default function JournalScreen() {
  const { date, entries, loadFromSupabase } = useJournalStore();
  const macros = useUserStore((s) => s.macros);

  useEffect(() => {
    loadFromSupabase();
  }, []);

  const totalCal = entries.reduce((sum, e) => sum + e.calories, 0);
  const totalProt = entries.reduce((sum, e) => sum + e.proteines, 0);
  const totalGluc = entries.reduce((sum, e) => sum + e.glucides, 0);
  const totalLip = entries.reduce((sum, e) => sum + e.lipides, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text variant="headlineLarge" style={styles.title}>Journal</Text>
          <Text variant="bodyMedium" style={styles.date}>
            {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </Animated.View>

        {/* Carte total — hero */}
        <Animated.View entering={FadeInDown.duration(450).delay(80)} style={styles.totalCard}>
          <Text variant="bodySmall" style={styles.totalLabel}>Total du jour</Text>
          <Text variant="displaySmall" style={styles.totalValue}>
            {Math.round(totalCal)}
            <Text style={styles.totalTarget}>{macros ? ` / ${macros.calories}` : ''} kcal</Text>
          </Text>
          <View style={styles.macrosRow}>
            <MacroPill label="P" current={Math.round(totalProt)} target={macros?.proteines_g} color={colors.macroProteine} />
            <MacroPill label="G" current={Math.round(totalGluc)} target={macros?.glucides_g} color={colors.macroGlucide} />
            <MacroPill label="L" current={Math.round(totalLip)} target={macros?.lipides_g} color={colors.macroLipide} />
          </View>
        </Animated.View>

        {MEALS.map((meal, i) => (
          <Animated.View key={meal} entering={FadeInDown.duration(450).delay(160 + i * 60)}>
            <MealSection
              meal={meal}
              entries={entries.filter((e) => e.repas === meal)}
            />
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function MealSection({ meal, entries }: { meal: MealType; entries: JournalEntry[] }) {
  const removeEntry = useJournalStore((s) => s.removeEntry);
  const mealCalories = entries.reduce((sum, e) => sum + e.calories, 0);

  const handleAdd = () => {
    haptic.light();
    router.push({ pathname: '/search-food', params: { meal } });
  };

  const handleRemove = (id: string) => {
    haptic.light();
    removeEntry(id);
  };

  return (
    <View style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
          <Text style={{ fontSize: 22 }}>{MEAL_EMOJI[meal]}</Text>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ color: colors.text }}>{MEAL_LABELS[meal]}</Text>
            {entries.length > 0 && (
              <Text variant="bodySmall" style={{ color: colors.textMuted, marginTop: 2 }}>
                {Math.round(mealCalories)} kcal · {entries.length} {entries.length > 1 ? 'aliments' : 'aliment'}
              </Text>
            )}
          </View>
        </View>
        <Pressable onPress={handleAdd} style={styles.addBtn} hitSlop={8}>
          <Text variant="titleLarge" style={{ color: palette.primary600, lineHeight: 24 }}>+</Text>
        </Pressable>
      </View>

      {entries.map((entry) => (
        <View key={entry.id} style={styles.entryRow}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" style={{ color: colors.text }} numberOfLines={1}>
              {entry.nom}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted, marginTop: 2 }}>
              {entry.quantite_g} g · {Math.round(entry.calories)} kcal
            </Text>
            <View style={styles.entryMacros}>
              <Text variant="bodySmall" style={{ color: colors.macroProteine }}>P {entry.proteines}g</Text>
              <Text variant="bodySmall" style={{ color: colors.macroGlucide }}>G {entry.glucides}g</Text>
              <Text variant="bodySmall" style={{ color: colors.macroLipide }}>L {entry.lipides}g</Text>
            </View>
          </View>
          <IconButton
            icon="close"
            size={18}
            iconColor={colors.textMuted}
            onPress={() => handleRemove(entry.id)}
          />
        </View>
      ))}

      {entries.length === 0 && (
        <Pressable onPress={handleAdd} style={styles.emptyState}>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            Aucun aliment — touche pour ajouter
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function MacroPill({ label, current, target, color }: { label: string; current: number; target?: number; color: string }) {
  return (
    <View style={styles.macroPill}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text variant="labelLarge" style={{ color: colors.text }}>
        {label} {current}<Text style={{ color: colors.textMuted }}>{target ? ` / ${target}` : ''}g</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  title: { color: colors.text, fontFamily: 'Inter_700Bold' },
  date: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    textTransform: 'capitalize',
  },
  totalCard: {
    backgroundColor: palette.primary500,
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  totalLabel: { color: 'rgba(255,255,255,0.85)' },
  totalValue: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    marginTop: spacing.xs,
  },
  totalTarget: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  macroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  mealCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addBtn: {
    width: 36, height: 36,
    borderRadius: radius.full,
    backgroundColor: palette.primary100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  entryMacros: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  emptyState: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
});
