import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, SegmentedButtons, Card, useTheme, Button, Portal, Modal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Rect, Line } from 'react-native-svg';
import { colors, spacing, radius, shadow, palette } from '../../theme/tokens';
import { supabase } from '../../lib/supabase';
import { useUserStore } from '../../stores/userStore';
import { useWeightStore } from '../../stores/weightStore';
import { MEAL_LABELS, type MealType } from '../../stores/journalStore';

interface DayData {
  date: string;
  calories: number;
  proteines: number;
  glucides: number;
  lipides: number;
  entries: { nom: string; repas: MealType; calories: number; quantite_g: number }[];
}

const JOURS = [
  { value: 0, label: 'Dim' },
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
];

const HEURES = ['07:00', '08:00', '09:00', '10:00', '18:00', '19:00', '20:00'];

export default function HistoriqueScreen() {
  const theme = useTheme();
  const profile = useUserStore((s) => s.profile);
  const macros = useUserStore((s) => s.macros);
  const markIntroSeen = useUserStore((s) => s.markIntroSeen);
  const setPeseeSchedule = useUserStore((s) => s.setPeseeSchedule);

  const history = useWeightStore((s) => s.history);
  const loadHistory = useWeightStore((s) => s.loadHistory);

  const [view, setView] = useState('semaine');
  const [data, setData] = useState<DayData[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [streak, setStreak] = useState(0);

  // Pop-up d'introduction (premiere visite uniquement)
  const [showIntro, setShowIntro] = useState(false);
  const [introJour, setIntroJour] = useState<number>(1); // lundi
  const [introHeure, setIntroHeure] = useState<string>('09:00');

  useEffect(() => { loadHistory(); }, []);

  // Recharge l'historique a chaque retour sur l'onglet (apres une nouvelle pesee)
  useFocusEffect(useCallback(() => { loadHistory(); }, []));

  useEffect(() => {
    loadData();
  }, [view]);

  useEffect(() => {
    if (profile && !profile.intro_seen?.stats) {
      setShowIntro(true);
    }
  }, [profile?.id]);

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

    const grouped = new Map<string, DayData>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - days + 1 + i);
      const dateStr = d.toISOString().split('T')[0];
      grouped.set(dateStr, { date: dateStr, calories: 0, proteines: 0, glucides: 0, lipides: 0, entries: [] });
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

    let s = 0;
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i].entries.length > 0) s++;
      else break;
    }
    setStreak(s);
  };

  const closeIntro = async () => {
    await setPeseeSchedule(introJour, introHeure);
    await markIntroSeen('stats');
    setShowIntro(false);
  };

  // Donnees evolution poids
  const poidsInitial = history.length > 0 ? history[0].poids_kg : profile?.poids ?? 0;
  const poidsActuel = history.length > 0 ? history[history.length - 1].poids_kg : profile?.poids ?? 0;
  const ecart = poidsActuel - poidsInitial;
  const ecartLabel = ecart === 0 ? '0' : (ecart > 0 ? `+${ecart.toFixed(1)}` : ecart.toFixed(1));
  const ecartColor = profile?.objectif === 'perte'
    ? (ecart < 0 ? '#4CAF50' : ecart > 0 ? '#E57373' : theme.colors.onSurface)
    : profile?.objectif === 'prise'
    ? (ecart > 0 ? '#4CAF50' : ecart < 0 ? '#E57373' : theme.colors.onSurface)
    : theme.colors.onSurface;

  // Progression vers le poids cible
  const poidsObjectif = profile?.poids_objectif;
  const objectifAtteintLe = profile?.objectif_atteint_le;
  let progressionPct = 0;
  if (poidsObjectif !== null && poidsObjectif !== undefined && profile && poidsInitial !== poidsObjectif) {
    const distanceTotale = Math.abs(poidsInitial - poidsObjectif);
    const distanceParcourue = Math.abs(poidsInitial - poidsActuel);
    progressionPct = Math.min(100, Math.max(0, Math.round((distanceParcourue / distanceTotale) * 100)));
  }

  // Composition corporelle (derniere mesure)
  const lastWithComposition = [...history].reverse().find((h) => h.masse_grasse_pct !== undefined);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.onBackground }]}>
            Statistiques
          </Text>
        </Animated.View>

        {/* Carte evolution poids */}
        <Animated.View entering={FadeInDown.duration(450).delay(80)}>
        <Card style={styles.card} mode="contained">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Mon évolution</Text>
            <View style={styles.evolutionRow}>
              <View style={styles.evolutionCell}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Initial</Text>
                <Text variant="titleLarge" style={{ fontWeight: '600' }}>{poidsInitial.toFixed(1)}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>kg</Text>
              </View>
              <View style={styles.evolutionCell}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Actuel</Text>
                <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                  {poidsActuel.toFixed(1)}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>kg</Text>
              </View>
              {poidsObjectif !== null && poidsObjectif !== undefined ? (
                <View style={styles.evolutionCell}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Cible</Text>
                  <Text variant="titleLarge" style={{ fontWeight: '600' }}>{poidsObjectif.toFixed(1)}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>kg</Text>
                </View>
              ) : (
                <View style={styles.evolutionCell}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Écart</Text>
                  <Text variant="titleLarge" style={{ fontWeight: '600', color: ecartColor }}>
                    {ecartLabel}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>kg</Text>
                </View>
              )}
            </View>

            {poidsObjectif !== null && poidsObjectif !== undefined && (
              <View style={styles.progressBlock}>
                <View style={[styles.progressBar, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progressionPct}%`,
                        backgroundColor: objectifAtteintLe ? '#4CAF50' : theme.colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text variant="bodySmall" style={[styles.progressLabel, { color: theme.colors.onSurfaceVariant }]}>
                  {objectifAtteintLe
                    ? '🎯 Objectif atteint, on maintient'
                    : `${progressionPct}% du chemin parcouru`}
                </Text>
              </View>
            )}
            <Button
              mode="contained-tonal"
              icon="scale-bathroom"
              onPress={() => router.push('/peser')}
              style={styles.addBtn}
            >
              Ajouter une pesée
            </Button>
            <Button
              mode="text"
              icon="upload"
              onPress={() => router.push('/import-pesees')}
              compact
              style={styles.importLink}
            >
              Importer mes anciennes pesées
            </Button>
          </Card.Content>
        </Card>
        </Animated.View>

        {/* Composition corporelle si dispo */}
        {lastWithComposition && (
          <Card style={styles.card} mode="contained">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>Composition corporelle</Text>
              <View style={styles.compoRow}>
                {lastWithComposition.masse_grasse_pct !== undefined && (
                  <CompoCell label="Grasse" value={`${lastWithComposition.masse_grasse_pct}%`} color="#FF9800" />
                )}
                {lastWithComposition.masse_musculaire_pct !== undefined && (
                  <CompoCell label="Muscle" value={`${lastWithComposition.masse_musculaire_pct}%`} color="#4CAF50" />
                )}
                {lastWithComposition.masse_hydrique_pct !== undefined && (
                  <CompoCell label="Eau" value={`${lastWithComposition.masse_hydrique_pct}%`} color="#2196F3" />
                )}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Streak */}
        {streak > 1 && (
          <Card style={[styles.card, { backgroundColor: '#E8F5E9' }]} mode="contained">
            <Card.Content style={{ alignItems: 'center' }}>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', color: '#2E7D32' }}>
                🔥 {streak} jours d'affilée
              </Text>
              <Text variant="bodySmall" style={{ color: '#388E3C' }}>
                Continue comme ça !
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Periode */}
        <SegmentedButtons
          value={view}
          onValueChange={setView}
          buttons={[
            { value: 'semaine', label: '7 jours' },
            { value: 'mois', label: '30 jours' },
          ]}
          style={styles.segmented}
        />

        {/* Calories */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Calories
        </Text>
        <Card style={styles.card} mode="contained">
          <Card.Content>
            <CalorieChart data={data} target={macros?.calories ?? 2000} onSelectDay={setSelectedDay} />
          </Card.Content>
        </Card>

        {/* Macros moyennes */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Macronutriments
        </Text>
        <Card style={styles.card} mode="contained">
          <Card.Content>
            <MacroChart data={data} />
          </Card.Content>
        </Card>

        {/* Detail du jour */}
        {selectedDay && selectedDay.entries.length > 0 && (
          <>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              {new Date(selectedDay.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Card style={styles.card} mode="contained">
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

      {/* Pop-up intro (premiere visite) */}
      <Portal>
        <Modal
          visible={showIntro}
          onDismiss={() => {}}
          dismissable={false}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>📊</Text>
            <Text variant="headlineSmall" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              Bienvenue dans tes stats
            </Text>
            <Text variant="bodyMedium" style={[styles.modalDesc, { color: theme.colors.onSurfaceVariant }]}>
              Cet onglet suit ton évolution dans le temps : poids, composition corporelle et nutrition. Plus tu loggues, plus c'est utile.
            </Text>

            <Text variant="titleMedium" style={styles.modalSection}>Ton jour de pesée</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
              Choisis le jour où tu veux te peser chaque semaine. On te le rappellera.
            </Text>
            <View style={styles.jourRow}>
              {JOURS.map((j) => {
                const isSel = introJour === j.value;
                return (
                  <Button
                    key={j.value}
                    mode={isSel ? 'contained' : 'outlined'}
                    compact
                    onPress={() => setIntroJour(j.value)}
                    style={styles.jourBtn}
                    contentStyle={{ paddingHorizontal: 0 }}
                  >
                    {j.label}
                  </Button>
                );
              })}
            </View>

            <Text variant="titleMedium" style={styles.modalSection}>Heure du rappel</Text>
            <View style={styles.heureRow}>
              {HEURES.map((h) => {
                const isSel = introHeure === h;
                return (
                  <Button
                    key={h}
                    mode={isSel ? 'contained' : 'outlined'}
                    compact
                    onPress={() => setIntroHeure(h)}
                    style={styles.heureBtn}
                  >
                    {h}
                  </Button>
                );
              })}
            </View>

            <Card mode="contained" style={[styles.tips, { backgroundColor: theme.colors.primaryContainer }]}>
              <Card.Content>
                <Text variant="titleSmall" style={{ fontWeight: '600', marginBottom: 8, color: theme.colors.onPrimaryContainer }}>
                  💡 Pour bien te peser
                </Text>
                <Text variant="bodySmall" style={{ lineHeight: 18, color: theme.colors.onPrimaryContainer }}>
                  • Le matin à jeun, après le passage aux toilettes{'\n'}
                  • Sans vêtements (ou toujours les mêmes){'\n'}
                  • Toujours le même jour de la semaine{'\n'}
                  • Sur une surface dure (pas un tapis){'\n'}
                  • Garde la même méthode pour des données comparables
                </Text>
              </Card.Content>
            </Card>

            <Button
              mode="contained"
              onPress={closeIntro}
              style={styles.modalBtn}
              contentStyle={{ paddingVertical: 6 }}
            >
              C'est parti !
            </Button>
          </ScrollView>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

function CompoCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginBottom: 4 }} />
      <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>{value}</Text>
      <Text variant="bodySmall" style={{ opacity: 0.6 }}>{label}</Text>
    </View>
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
        <Line
          x1={padding}
          y1={chartHeight - padding - (target / maxCal) * (chartHeight - padding * 2)}
          x2={chartWidth - padding}
          y2={chartHeight - padding - (target / maxCal) * (chartHeight - padding * 2)}
          stroke={theme.colors.outline}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        {data.map((day, i) => {
          const barHeight = (day.calories / maxCal) * (chartHeight - padding * 2);
          const x = padding + i * ((chartWidth - padding * 2) / data.length) + 2;
          const y = chartHeight - padding - barHeight;
          const ratio = day.calories / target;
          const color = day.calories === 0 ? theme.colors.surfaceVariant :
            ratio < 0.9 ? '#4CAF50' : ratio <= 1.1 ? '#FF9800' : '#E57373';
          return (
            <Rect key={i} x={x} y={y} width={barWidth} height={Math.max(barHeight, 2)} rx={2} fill={color} onPress={() => onSelectDay(day)} />
          );
        })}
      </Svg>
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
  const filled = data.filter((d) => d.entries.length > 0);
  const n = filled.length || 1;
  const avgProt = filled.reduce((s, d) => s + d.proteines, 0) / n;
  const avgGluc = filled.reduce((s, d) => s + d.glucides, 0) / n;
  const avgLip = filled.reduce((s, d) => s + d.lipides, 0) / n;

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
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing['4xl'] },
  title: { fontFamily: 'Inter_700Bold', color: colors.text, marginBottom: spacing.lg },
  card: {
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  cardTitle: { color: colors.text, marginBottom: spacing.md },
  evolutionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  evolutionCell: { alignItems: 'center', flex: 1 },
  addBtn: { borderRadius: 12, marginTop: 4 },
  importLink: { alignSelf: 'center', marginTop: 4 },
  progressBlock: { marginTop: 12, marginBottom: 4 },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: { textAlign: 'center', marginTop: 6 },
  compoRow: { flexDirection: 'row', justifyContent: 'space-around' },
  segmented: { marginBottom: 16 },
  sectionTitle: { fontWeight: '600', marginBottom: 8 },
  dayMacros: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  mealSection: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' },

  modal: {
    margin: 16,
    padding: 24,
    borderRadius: 24,
    maxHeight: '90%',
  },
  modalTitle: { fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  modalDesc: { textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  modalSection: { fontWeight: '600', marginTop: 16, marginBottom: 8 },
  jourRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  jourBtn: { flex: 1, minWidth: 40, borderRadius: 8 },
  heureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heureBtn: { borderRadius: 8 },
  tips: { marginTop: 16, borderRadius: 12 },
  modalBtn: { marginTop: 20, borderRadius: 12 },
});
