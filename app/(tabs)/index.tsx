import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Text, Card, Button, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';
import { useJournalStore } from '../../stores/journalStore';
import { useUserStore } from '../../stores/userStore';
import { useWeightStore, type WeightEntry } from '../../stores/weightStore';

function getProgressColor(ratio: number): string {
  if (ratio < 0.9) return '#4CAF50';
  if (ratio <= 1.1) return '#FF9800';
  return '#E57373';
}

export default function DashboardScreen() {
  const theme = useTheme();
  const { entries, loadFromSupabase } = useJournalStore();
  const profile = useUserStore((s) => s.profile);
  const macros = useUserStore((s) => s.macros);
  const { history, loadHistory, addWeight } = useWeightStore();

  const [showWeightInput, setShowWeightInput] = useState(false);
  const [weightValue, setWeightValue] = useState('');

  useEffect(() => {
    loadFromSupabase();
    loadHistory();
  }, []);

  const totalCal = entries.reduce((sum, e) => sum + e.calories, 0);
  const totalProt = entries.reduce((sum, e) => sum + e.proteines, 0);
  const totalGluc = entries.reduce((sum, e) => sum + e.glucides, 0);
  const totalLip = entries.reduce((sum, e) => sum + e.lipides, 0);

  const calTarget = macros?.calories ?? 2000;
  const calRatio = totalCal / calTarget;

  // Verifier si la derniere pesee date de plus de 14 jours
  const lastWeightDate = history.length > 0 ? history[history.length - 1].date : null;
  const daysSinceLastWeight = lastWeightDate
    ? Math.floor((Date.now() - new Date(lastWeightDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const needsWeightUpdate = daysSinceLastWeight !== null && daysSinceLastWeight >= 30;

  const handleAddWeight = async () => {
    const val = parseFloat(weightValue.replace(',', '.'));
    if (!val || val < 20 || val > 300) return;
    await addWeight(val);

    // Mettre a jour le poids dans le profil + recalculer les macros
    const currentProfile = useUserStore.getState().profile;
    if (currentProfile && val !== currentProfile.poids) {
      await useUserStore.getState().saveProfile({
        ...currentProfile,
        poids: val,
      });
    }

    setWeightValue('');
    setShowWeightInput(false);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          {profile?.nom ? `Salut ${profile.nom}` : 'Vekio'}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24 }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>

        {/* Jauge circulaire calories */}
        <View style={styles.gaugeContainer}>
          <CalorieGauge
            current={Math.round(totalCal)}
            target={calTarget}
            color={getProgressColor(calRatio)}
          />
        </View>

        {/* Barres macros */}
        <View style={styles.macrosContainer}>
          <MacroBar
            label="Protéines"
            current={Math.round(totalProt)}
            target={macros?.proteines_g ?? 0}
            unit="g"
            color="#4CAF50"
          />
          <MacroBar
            label="Glucides"
            current={Math.round(totalGluc)}
            target={macros?.glucides_g ?? 0}
            unit="g"
            color="#FF9800"
          />
          <MacroBar
            label="Lipides"
            current={Math.round(totalLip)}
            target={macros?.lipides_g ?? 0}
            unit="g"
            color="#2196F3"
          />
        </View>

        {/* Rappel mise a jour poids */}
        {needsWeightUpdate && (
          <Card style={[styles.reminderCard, { backgroundColor: '#FFF3E0' }]} mode="contained">
            <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text variant="bodyMedium" style={{ flex: 1, color: '#E65100' }}>
                Ça fait {daysSinceLastWeight} jours ! Mets à jour ton poids et vérifie ton objectif.
              </Text>
              <Button
                mode="contained"
                compact
                onPress={() => setShowWeightInput(true)}
                buttonColor="#FF9800"
              >
                Peser
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Courbe de poids */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Évolution du poids
        </Text>

        <Card style={styles.weightCard} mode="outlined">
          <Card.Content>
            {history.length > 0 ? (
              <WeightChart history={history} />
            ) : (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', fontStyle: 'italic' }}>
                Aucune donnée de poids enregistrée
              </Text>
            )}

            {showWeightInput ? (
              <View style={styles.weightInputRow}>
                <TextInput
                  label="Poids"
                  value={weightValue}
                  onChangeText={setWeightValue}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  right={<TextInput.Affix text="kg" />}
                  style={{ flex: 1 }}
                  dense
                />
                <Button mode="contained" onPress={handleAddWeight} style={{ marginLeft: 8, marginTop: 6 }}>
                  OK
                </Button>
                <Button mode="text" onPress={() => setShowWeightInput(false)} style={{ marginTop: 6 }}>
                  X
                </Button>
              </View>
            ) : (
              <Button
                mode="contained-tonal"
                onPress={() => setShowWeightInput(true)}
                style={{ marginTop: 12 }}
                icon="scale-bathroom"
              >
                Entrer mon poids du jour
              </Button>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

function CalorieGauge({ current, target, color }: { current: number; target: number; color: string }) {
  const theme = useTheme();
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / target, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const remaining = Math.max(target - current, 0);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.surfaceVariant}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
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
        <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>{current}</Text>
        <Text variant="bodySmall" style={{ opacity: 0.6 }}>/ {target} kcal</Text>
        <Text variant="bodySmall" style={{ color, marginTop: 4 }}>
          {remaining > 0 ? `${remaining} restantes` : 'Objectif atteint'}
        </Text>
      </View>
    </View>
  );
}

function MacroBar({ label, current, target, unit, color }: {
  label: string; current: number; target: number; unit: string; color: string;
}) {
  const theme = useTheme();
  const ratio = target > 0 ? current / target : 0;
  const progressWidth = `${Math.min(ratio * 100, 100)}%`;
  const barColor = getProgressColor(ratio);

  return (
    <View style={styles.macroBarContainer}>
      <View style={styles.macroBarHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
          <Text variant="bodyMedium">{label}</Text>
        </View>
        <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
          {current} / {target}{unit}
        </Text>
      </View>
      <View style={[styles.macroBarBg, { backgroundColor: theme.colors.surfaceVariant }]}>
        <View style={[styles.macroBarFill, { width: progressWidth as any, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

function WeightChart({ history }: { history: WeightEntry[] }) {
  const theme = useTheme();
  // Afficher les 14 derniers jours max
  const recent = history.slice(-14);

  if (recent.length < 2) {
    const entry = recent[0];
    return (
      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>{entry.poids_kg} kg</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, fontStyle: 'italic' }}>
          Ajoute plus de pesées pour voir la courbe
        </Text>
      </View>
    );
  }

  const weights = recent.map((e) => e.poids_kg);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const range = maxW - minW || 1;

  const chartWidth = 280;
  const chartHeight = 120;
  const padding = 8;

  const points = recent.map((entry, i) => {
    const x = padding + (i / (recent.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((entry.poids_kg - minW) / range) * (chartHeight - padding * 2);
    return { x, y, ...entry };
  });

  const diff = weights[weights.length - 1] - weights[0];
  const diffText = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  const diffColor = diff < 0 ? '#4CAF50' : diff > 0 ? '#E57373' : theme.colors.onSurfaceVariant;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>
          {weights[weights.length - 1]} kg
        </Text>
        <Text variant="bodyMedium" style={{ color: diffColor, fontWeight: '600' }}>
          {diffText} kg
        </Text>
      </View>

      <Svg width={chartWidth} height={chartHeight}>
        {/* Ligne de la courbe */}
        {points.map((point, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          return (
            <Line
              key={i}
              x1={prev.x}
              y1={prev.y}
              x2={point.x}
              y2={point.y}
              stroke={theme.colors.primary}
              strokeWidth={2.5}
            />
          );
        })}
        {/* Points */}
        {points.map((point, i) => (
          <Circle
            key={`dot-${i}`}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={theme.colors.primary}
          />
        ))}
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: chartWidth, paddingHorizontal: padding }}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {new Date(recent[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {new Date(recent[recent.length - 1].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
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
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  gaugeText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  macrosContainer: {
    gap: 16,
    marginBottom: 28,
  },
  macroBarContainer: {
    gap: 6,
  },
  macroBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  reminderCard: {
    marginBottom: 16,
  },
  weightCard: {
    marginBottom: 16,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
});
