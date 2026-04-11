import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, SegmentedButtons, Card, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Line, Circle } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { useUserStore } from '../../stores/userStore';
import { MEAL_LABELS, type MealType } from '../../stores/journalStore';

interface DayData {
  date: string;
  calories: number;
  proteines: number;
  glucides: number;
  lipides: number;
  entries: { nom: string; repas: MealType; calories: number; quantite_g: number }[];
}

export default function HistoriqueScreen() {
  const theme = useTheme();
  const [view, setView] = useState('semaine');
  const [data, setData] = useState<DayData[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [streak, setStreak] = useState(0);
  const macros = useUserStore((s) => s.macros);

  useEffect(() => {
    loadData();
  }, [view]);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const days = view === 'semaine' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    const startStr = startDate.toISOString().split('T')[0];

    const { data: rows } = await supabase
      .from('journal')
      .select('date, nom, repas, calories, proteines_g, glucides_g, lipides_g, quantite_g')
      .eq('user_id', user.id)
      .gte('date', startStr)
      .order('date', { ascending: true });

    if (!rows) return;

    // Grouper par date
    const grouped = new Map<string, DayData>();

    // Creer toutes les dates (meme vides)
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - days + 1 + i);
      const dateStr = d.toISOString().split('T')[0];
      grouped.set(dateStr, {
        date: dateStr,
        calories: 0,
        proteines: 0,
        glucides: 0,
        lipides: 0,
        entries: [],
      });
    }

    rows.forEach((row) => {
      const day = grouped.get(row.date);
      if (day) {
        day.calories += Number(row.calories);
        day.proteines += Number(row.proteines_g);
        day.glucides += Number(row.glucides_g);
        day.lipides += Number(row.lipides_g);
        day.entries.push({
          nom: row.nom,
          repas: row.repas as MealType,
          calories: Number(row.calories),
          quantite_g: Number(row.quantite_g),
        });
      }
    });

    const result = Array.from(grouped.values());
    setData(result);

    // Calculer le streak (jours consecutifs avec au moins 1 entree)
    let s = 0;
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i].entries.length > 0) s++;
      else break;
    }
    setStreak(s);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Statistiques
        </Text>

        <SegmentedButtons
          value={view}
          onValueChange={setView}
          buttons={[
            { value: 'semaine', label: '7 jours' },
            { value: 'mois', label: '30 jours' },
          ]}
          style={styles.segmented}
        />

        {/* Streak */}
        {streak > 1 && (
          <Card style={[styles.streakCard, { backgroundColor: '#E8F5E9' }]} mode="contained">
            <Card.Content style={{ alignItems: 'center' }}>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', color: '#2E7D32' }}>
                {streak} jours d'affilée
              </Text>
              <Text variant="bodySmall" style={{ color: '#388E3C' }}>
                Continue comme ça !
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Graphique calories */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Calories
        </Text>
        <Card style={styles.chartCard} mode="outlined">
          <Card.Content>
            <CalorieChart
              data={data}
              target={macros?.calories ?? 2000}
              onSelectDay={setSelectedDay}
            />
          </Card.Content>
        </Card>

        {/* Graphique macros */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Macronutriments
        </Text>
        <Card style={styles.chartCard} mode="outlined">
          <Card.Content>
            <MacroChart data={data} />
          </Card.Content>
        </Card>

        {/* Detail du jour selectionne */}
        {selectedDay && selectedDay.entries.length > 0 && (
          <>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              {new Date(selectedDay.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Card style={styles.chartCard} mode="outlined">
              <Card.Content>
                <View style={styles.dayMacros}>
                  <DayStat label="Calories" value={`${Math.round(selectedDay.calories)}`} unit="kcal" color={theme.colors.primary} />
                  <DayStat label="Prot" value={`${Math.round(selectedDay.proteines)}`} unit="g" color="#4CAF50" />
                  <DayStat label="Gluc" value={`${Math.round(selectedDay.glucides)}`} unit="g" color="#FF9800" />
                  <DayStat label="Lip" value={`${Math.round(selectedDay.lipides)}`} unit="g" color="#2196F3" />
                </View>

                {(['petit_dejeuner', 'dejeuner', 'diner', 'collation'] as MealType[]).map((meal) => {
                  const mealEntries = selectedDay.entries.filter((e) => e.repas === meal);
                  if (mealEntries.length === 0) return null;
                  return (
                    <View key={meal} style={styles.mealSection}>
                      <Text variant="titleSmall" style={{ fontWeight: '600', marginBottom: 4 }}>
                        {MEAL_LABELS[meal]}
                      </Text>
                      {mealEntries.map((entry, i) => (
                        <Text key={i} variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          • {entry.nom} ({entry.quantite_g}g) — {Math.round(entry.calories)} kcal
                        </Text>
                      ))}
                    </View>
                  );
                })}
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CalorieChart({ data, target, onSelectDay }: { data: DayData[]; target: number; onSelectDay: (d: DayData) => void }) {
  const theme = useTheme();
  const chartWidth = 300;
  const chartHeight = 150;
  const padding = 24;
  const barWidth = Math.max(4, (chartWidth - padding * 2) / data.length - 4);

  const maxCal = Math.max(target, ...data.map((d) => d.calories)) * 1.1;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Ligne objectif */}
        <Line
          x1={padding}
          y1={chartHeight - padding - (target / maxCal) * (chartHeight - padding * 2)}
          x2={chartWidth - padding}
          y2={chartHeight - padding - (target / maxCal) * (chartHeight - padding * 2)}
          stroke={theme.colors.outline}
          strokeWidth={1}
          strokeDasharray="4,4"
        />

        {/* Barres */}
        {data.map((day, i) => {
          const barHeight = (day.calories / maxCal) * (chartHeight - padding * 2);
          const x = padding + i * ((chartWidth - padding * 2) / data.length) + 2;
          const y = chartHeight - padding - barHeight;
          const ratio = day.calories / target;
          const color = day.calories === 0 ? theme.colors.surfaceVariant :
            ratio < 0.9 ? '#4CAF50' : ratio <= 1.1 ? '#FF9800' : '#E57373';

          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 2)}
              rx={2}
              fill={color}
              onPress={() => onSelectDay(day)}
            />
          );
        })}
      </Svg>

      {/* Labels dates */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: chartWidth, paddingHorizontal: padding }}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {data.length > 0 ? new Date(data[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.6 }}>
          — objectif {target} kcal/j —
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {data.length > 0 ? new Date(data[data.length - 1].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
        </Text>
      </View>
    </View>
  );
}

function MacroChart({ data }: { data: DayData[] }) {
  const theme = useTheme();

  const avgProt = data.length > 0 ? data.reduce((s, d) => s + d.proteines, 0) / data.filter((d) => d.entries.length > 0).length || 0 : 0;
  const avgGluc = data.length > 0 ? data.reduce((s, d) => s + d.glucides, 0) / data.filter((d) => d.entries.length > 0).length || 0 : 0;
  const avgLip = data.length > 0 ? data.reduce((s, d) => s + d.lipides, 0) / data.filter((d) => d.entries.length > 0).length || 0 : 0;

  return (
    <View style={{ gap: 12 }}>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
        Moyenne journalière
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <DayStat label="Protéines" value={`${Math.round(avgProt)}`} unit="g" color="#4CAF50" />
        <DayStat label="Glucides" value={`${Math.round(avgGluc)}`} unit="g" color="#FF9800" />
        <DayStat label="Lipides" value={`${Math.round(avgLip)}`} unit="g" color="#2196F3" />
      </View>
    </View>
  );
}

function DayStat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginBottom: 4 }} />
      <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{value}</Text>
      <Text variant="bodySmall" style={{ opacity: 0.6 }}>{unit}</Text>
      <Text variant="bodySmall" style={{ opacity: 0.6 }}>{label}</Text>
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
    marginBottom: 16,
  },
  segmented: {
    marginBottom: 20,
  },
  streakCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  chartCard: {
    marginBottom: 20,
  },
  dayMacros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  mealSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});
