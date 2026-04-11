import { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useJournalStore } from '../../stores/journalStore';
import { useUserStore } from '../../stores/userStore';
import { useHydratationStore } from '../../stores/hydratationStore';

function getProgressColor(ratio: number): string {
  if (ratio < 0.9) return '#4CAF50';
  if (ratio <= 1.1) return '#FF9800';
  return '#E57373';
}

const GLASS_ML = 250;

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

  const totalGlasses = Math.ceil(objectifMl / GLASS_ML);
  const filledGlasses = Math.floor(totalMl / GLASS_ML);

  return (
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

        {/* Hydratation */}
        <Card style={styles.hydratationCard} mode="outlined">
          <Card.Content>
            <View style={styles.hydratationHeader}>
              <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                Hydratation
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {totalMl} / {objectifMl} ml
              </Text>
            </View>

            <View style={styles.glassesRow}>
              {Array.from({ length: totalGlasses }, (_, i) => {
                const isFilled = i < filledGlasses;
                return (
                  <Pressable
                    key={i}
                    onPress={() => {
                      if (isFilled && i === filledGlasses - 1) {
                        removeWater(GLASS_ML);
                      } else if (!isFilled && i === filledGlasses) {
                        addWater(GLASS_ML);
                      }
                    }}
                  >
                    <Text style={{ fontSize: 28, opacity: isFilled ? 1 : 0.2 }}>
                      💧
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.hydratationActions}>
              <Pressable
                onPress={() => removeWater(GLASS_ML)}
                style={[styles.hydratationBtn, { backgroundColor: theme.colors.surfaceVariant }]}
              >
                <Text variant="titleMedium">−</Text>
              </Pressable>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {GLASS_ML} ml par verre
              </Text>
              <Pressable
                onPress={() => addWater(GLASS_ML)}
                style={[styles.hydratationBtn, { backgroundColor: '#E3F2FD' }]}
              >
                <Text variant="titleMedium" style={{ color: '#1976D2' }}>+</Text>
              </Pressable>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
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
  hydratationCard: {
    marginBottom: 16,
  },
  hydratationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  glassesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 12,
  },
  hydratationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hydratationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
