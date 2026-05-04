import { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useJournalStore, MEAL_LABELS, type MealType, type JournalEntry } from '../../stores/journalStore';
import { useUserStore } from '../../stores/userStore';
import { colors, spacing, radius, shadow, palette } from '../../theme/tokens';
import { haptic } from '../../lib/haptics';

const MEALS: MealType[] = ['petit_dejeuner', 'dejeuner', 'diner', 'collation'];

export default function JournalScreen() {
  const { entries, loadFromSupabase } = useJournalStore();
  const macros = useUserStore((s) => s.macros);

  useEffect(() => {
    loadFromSupabase();
  }, []);

  const totalCal = entries.reduce((sum, e) => sum + e.calories, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Mini-rappel discret : repere d'orientation, pas de duplication d'anneau */}
        <Text variant="bodyMedium" style={styles.miniSummary}>
          Aujourd'hui · {Math.round(totalCal)}{macros ? ` / ${macros.calories}` : ''} kcal
        </Text>

        {MEALS.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            entries={entries.filter((e) => e.repas === meal)}
          />
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
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={{ color: colors.text }}>{MEAL_LABELS[meal]}</Text>
          {entries.length > 0 && (
            <Text variant="bodySmall" style={{ color: colors.textMuted, marginTop: 2 }}>
              {Math.round(mealCalories)} kcal · {entries.length} {entries.length > 1 ? 'aliments' : 'aliment'}
            </Text>
          )}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  miniSummary: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
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
