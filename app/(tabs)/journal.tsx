import { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, Button, Card, IconButton, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useJournalStore, MEAL_LABELS, type MealType, type JournalEntry } from '../../stores/journalStore';
import { useUserStore } from '../../stores/userStore';

const MEALS: MealType[] = ['petit_dejeuner', 'dejeuner', 'diner', 'collation'];

export default function JournalScreen() {
  const theme = useTheme();
  const { date, entries, isLoading, loadFromSupabase } = useJournalStore();
  const macros = useUserStore((s) => s.macros);

  useEffect(() => {
    loadFromSupabase();
  }, []);

  const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0);
  const totalProteines = entries.reduce((sum, e) => sum + e.proteines, 0);
  const totalGlucides = entries.reduce((sum, e) => sum + e.glucides, 0);
  const totalLipides = entries.reduce((sum, e) => sum + e.lipides, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Journal
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>
          {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>

        <Card style={[styles.totalCard, { backgroundColor: theme.colors.primaryContainer }]} mode="contained">
          <Card.Content style={styles.totalContent}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
              Total du jour
            </Text>
            <Text variant="headlineLarge" style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold' }}>
              {Math.round(totalCalories)}{macros ? ` / ${macros.calories}` : ''} kcal
            </Text>
            <View style={styles.macrosRow}>
              <MacroPill
                label="P"
                current={Math.round(totalProteines)}
                target={macros?.proteines_g}
                color="#4CAF50"
              />
              <MacroPill
                label="G"
                current={Math.round(totalGlucides)}
                target={macros?.glucides_g}
                color="#FF9800"
              />
              <MacroPill
                label="L"
                current={Math.round(totalLipides)}
                target={macros?.lipides_g}
                color="#2196F3"
              />
            </View>
          </Card.Content>
        </Card>

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
  const theme = useTheme();
  const removeEntry = useJournalStore((s) => s.removeEntry);
  const mealCalories = entries.reduce((sum, e) => sum + e.calories, 0);

  return (
    <Card style={styles.mealCard} mode="outlined">
      <Card.Content>
        <View style={styles.mealHeader}>
          <View>
            <Text variant="titleMedium" style={{ fontWeight: '600' }}>
              {MEAL_LABELS[meal]}
            </Text>
            {entries.length > 0 && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {Math.round(mealCalories)} kcal
              </Text>
            )}
          </View>
          <Button
            mode="contained-tonal"
            compact
            onPress={() => router.push({ pathname: '/search-food', params: { meal } })}
          >
            + Ajouter
          </Button>
        </View>

        {entries.map((entry) => (
          <View key={entry.id} style={[styles.entryRow, { borderTopColor: theme.colors.outlineVariant }]}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" numberOfLines={1}>{entry.nom}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {entry.quantite_g}g — {Math.round(entry.calories)} kcal
              </Text>
              <View style={styles.entryMacros}>
                <Text variant="bodySmall" style={{ color: '#4CAF50', fontWeight: '600' }}>P {entry.proteines}g</Text>
                <Text variant="bodySmall" style={{ color: '#FF9800', fontWeight: '600' }}>G {entry.glucides}g</Text>
                <Text variant="bodySmall" style={{ color: '#2196F3', fontWeight: '600' }}>L {entry.lipides}g</Text>
              </View>
            </View>
            <IconButton
              icon="close"
              size={18}
              onPress={() => removeEntry(entry.id)}
            />
          </View>
        ))}

        {entries.length === 0 && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, fontStyle: 'italic' }}>
            Aucun aliment ajouté
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}

function MacroPill({ label, current, target, color }: { label: string; current: number; target?: number; color: string }) {
  return (
    <View style={styles.macroPill}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
        {label} {current}{target ? ` / ${target}` : ''}g
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontWeight: 'bold',
  },
  totalCard: {
    marginBottom: 20,
  },
  totalContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
  },
  macroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mealCard: {
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
  },
  entryMacros: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
});
