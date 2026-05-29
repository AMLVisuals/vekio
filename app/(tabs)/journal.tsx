import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useJournalStore, MEAL_LABELS, type MealType, type JournalEntry } from '../../stores/journalStore';
import { useUserStore } from '../../stores/userStore';
import { colors, spacing, radius, shadow, palette } from '../../theme/tokens';
import { haptic } from '../../lib/haptics';
import { useIntroPopup } from '../../lib/useIntroPopup';
import IntroModal from '../../components/IntroModal';

const MEALS: MealType[] = ['petit_dejeuner', 'dejeuner', 'diner', 'collation'];

export default function JournalScreen() {
  const { entries, loadFromSupabase } = useJournalStore();
  const macros = useUserStore((s) => s.macros);
  const intro = useIntroPopup('journal');

  useEffect(() => {
    loadFromSupabase();
  }, []);

  const totalCal = entries.reduce((sum, e) => sum + e.calories, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Bouton info en haut a droite */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <IconButton
            icon="information-outline"
            size={22}
            iconColor={colors.textMuted}
            onPress={intro.open}
            style={{ margin: 0 }}
          />
        </View>

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

      {/* Pop-up intro Journal */}
      <IntroModal
        visible={intro.visible}
        emoji="📋"
        title="Tes repas du jour"
        description="Tout ce que tu manges, organisé par repas."
        sections={[
          { icon: '➕', title: 'Ajouter un aliment', body: "Tape le bouton + sur n'importe quel repas pour rechercher un aliment ou scanner un code-barre." },
          { icon: '🔄', title: 'Synchronisation auto', body: "Les calories et macros s'additionnent automatiquement dans l'anneau du Dashboard, en temps réel." },
          { icon: '✨', title: 'Menus favoris', body: "Si tu manges souvent les mêmes plats, sauvegarde-les en menus depuis l'onglet Menus pour les ajouter en un tap." },
        ]}
        onValidate={intro.close}
        dismissable
        onDismiss={intro.close}
      />
    </SafeAreaView>
  );
}

function MealSection({ meal, entries }: { meal: MealType; entries: JournalEntry[] }) {
  const removeEntry = useJournalStore((s) => s.removeEntry);
  const mealCalories = entries.reduce((sum, e) => sum + e.calories, 0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = () => {
    haptic.light();
    router.push({ pathname: '/search-food', params: { meal } });
  };

  const handleRemove = (id: string) => {
    haptic.light();
    removeEntry(id);
  };

  const toggleExpand = (id: string) => {
    haptic.light();
    setExpandedId(expandedId === id ? null : id);
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

      {entries.map((entry) => {
        const expanded = expandedId === entry.id;
        return (
          <View key={entry.id}>
            <Pressable onPress={() => toggleExpand(entry.id)} style={styles.entryRow}>
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
                  <Text variant="bodySmall" style={{ color: colors.textMuted }}>{expanded ? '▲ détails' : '▼ détails'}</Text>
                </View>
              </View>
              <IconButton
                icon="close"
                size={18}
                iconColor={colors.textMuted}
                onPress={() => handleRemove(entry.id)}
              />
            </Pressable>
            {expanded ? (
              <View style={styles.entryDetails}>
                <DetailRow label="Fibres"      value={entry.fibres}      unit="g"  />
                <DetailRow label="Sucres"      value={entry.sucres}      unit="g"  />
                <DetailRow label="AG saturés"  value={entry.ags}         unit="g"  />
                <DetailRow label="Cholestérol" value={entry.cholesterol} unit="mg" />
                <DetailRow label="Sodium"      value={entry.sodium}      unit="mg" />
                <DetailRow label="Calcium"     value={entry.calcium}     unit="mg" />
                <DetailRow label="Fer"         value={entry.fer}         unit="mg" />
                <DetailRow label="Potassium"   value={entry.potassium}   unit="mg" />
              </View>
            ) : null}
          </View>
        );
      })}

      {entries.length === 0 && (
        <Pressable onPress={handleAdd} style={styles.emptyState}>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            Aucun aliment, touche pour ajouter
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// Ligne de detail micro affichee dans le tiroir d'un aliment.
// Affiche 0 en gris (donnee Ciqual valant 0 = info utile, pas absence).
function DetailRow({ label, value, unit }: { label: string; value: number | undefined; unit: 'g' | 'mg' }) {
  if (value === undefined) return null;
  const display = unit === 'mg' ? Math.round(value) : Math.round(value * 10) / 10;
  const isZero = value === 0;
  return (
    <View style={styles.detailRow}>
      <Text variant="bodySmall" style={{ color: colors.textMuted }}>{label}</Text>
      <Text variant="bodySmall" style={{ color: isZero ? colors.textMuted : colors.text }}>{display} {unit}</Text>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -spacing.sm,
    marginRight: -spacing.sm,
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
  entryDetails: {
    backgroundColor: palette.primary50 ?? '#f0fdf4',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
