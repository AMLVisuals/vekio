import { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, IconButton, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWeightStore, type WeightEntry } from '../stores/weightStore';
import { spacing, radius, shadow } from '../theme/tokens';

interface MonthGroup {
  key: string;
  label: string;
  items: WeightEntry[];
}

export default function PeseesScreen() {
  const theme = useTheme();
  const history = useWeightStore((s) => s.history);
  const loadHistory = useWeightStore((s) => s.loadHistory);

  useEffect(() => { loadHistory(); }, []);

  // Du plus recent au plus ancien, regroupe par mois (comme l'app de la balance).
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  const groups: MonthGroup[] = [];
  for (const h of sorted) {
    const d = new Date(h.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      g = { key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [] };
      groups.push(g);
    }
    g.items.push(h);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.topBar}>
        <IconButton icon="arrow-left" size={24} onPress={() => router.back()} />
        <Text variant="titleLarge" style={styles.title}>Toutes mes pesées</Text>
      </View>

      {history.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 16 }}>
            Aucune pesée pour l'instant.{'\n'}Ajoute ta première pesée pour commencer ton suivi.
          </Text>
          <Button mode="contained-tonal" icon="scale-bathroom" onPress={() => router.replace('/peser')}>
            Ajouter une pesée
          </Button>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {groups.map((g) => (
            <View key={g.key} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text variant="titleMedium" style={{ fontWeight: '600', color: theme.colors.onBackground }}>
                  {g.label}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {g.items.length} {g.items.length > 1 ? 'mesures' : 'mesure'}
                </Text>
              </View>

              {g.items.map((h, i) => (
                <View key={`${h.date}-${i}`} style={[styles.row, { backgroundColor: theme.colors.surface }]}>
                  <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                      {h.poids_kg.toFixed(1)} kg
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {new Date(h.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                  {h.masse_grasse_pct !== undefined && (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {h.masse_grasse_pct}% grasse
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 4 },
  title: { fontWeight: 'bold', marginLeft: 4 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing['4xl'] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  group: { marginBottom: spacing.lg },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.xl,
    marginBottom: 8,
    ...shadow.card,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
