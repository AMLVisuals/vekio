import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calculateNeeds } from '../../lib/nutrition';
import { useUserStore } from '../../stores/userStore';
import { useWeightStore } from '../../stores/weightStore';
import { requestNotificationPermission, scheduleLocalReminders } from '../../lib/notifications';
import type { Profile, Sport, Vitesse } from '../../lib/nutrition';

const OBJECTIF_LABELS: Record<string, string> = {
  perte: 'Perdre du poids',
  maintien: 'Maintenir mon poids',
  prise: 'Prendre de la masse',
};

const SPORT_LABELS: Record<string, { label: string; emoji: string }> = {
  musculation: { label: 'Musculation', emoji: '🏋️' },
  cardio:      { label: 'Cardio',      emoji: '🏃' },
  collectif:   { label: 'Sport collectif', emoji: '⚽' },
  martial:     { label: 'Boxe / Arts martiaux', emoji: '🥋' },
  yoga:        { label: 'Yoga / Pilates', emoji: '🧘' },
  autre:       { label: 'Autre',       emoji: '🏅' },
  aucun:       { label: 'Aucun',       emoji: '😴' },
};

const FREQ_LABELS: Record<number, string> = {
  1: '1 à 2 / sem',
  3: '3 à 4 / sem',
  5: '5+ / sem',
};

export default function OnboardingRecapScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<Record<string, string>>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sports: Sport[] = params.sports ? JSON.parse(params.sports) : [];
  const vitesseN = Number(params.vitesse);
  const vitesse: Vitesse | undefined = vitesseN === 0.25 || vitesseN === 0.5 || vitesseN === 0.75
    ? (vitesseN as Vitesse) : undefined;

  const masseGrasse = params.masse_grasse_pct ? Number(params.masse_grasse_pct) : undefined;
  const masseMusculaire = params.masse_musculaire_pct ? Number(params.masse_musculaire_pct) : undefined;
  const masseHydrique = params.masse_hydrique_pct ? Number(params.masse_hydrique_pct) : undefined;

  const profile: Profile = {
    sexe: params.sexe as Profile['sexe'],
    age: Number(params.age),
    poids: Number(params.poids),
    taille: Number(params.taille),
    objectif: params.objectif as Profile['objectif'],
    vitesse,
    sports,
    masseGrassePct: masseGrasse,
  };

  const macros = calculateNeeds(profile);

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      await useUserStore.getState().saveProfile({
        nom: params.nom,
        age: profile.age,
        poids: profile.poids,
        taille: profile.taille,
        sexe: profile.sexe,
        objectif: profile.objectif,
        vitesse_kg_semaine: vitesse ?? null,
        date_naissance: params.dateNaissance ?? null,
        sports,
        masse_grasse_pct: masseGrasse,
        masse_musculaire_pct: masseMusculaire,
        masse_hydrique_pct: masseHydrique,
      });

      // Premiere pesee = celle de l'inscription, avec composition si renseignee
      await useWeightStore.getState().addWeight({
        poids_kg: profile.poids,
        masse_grasse_pct: masseGrasse,
        masse_musculaire_pct: masseMusculaire,
        masse_hydrique_pct: masseHydrique,
        source: 'manuel',
      });

      const granted = await requestNotificationPermission();
      if (granted) await scheduleLocalReminders();

      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
      setError('Erreur lors de la sauvegarde. Réessaie.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="titleMedium" style={styles.step}>Étape 5/5</Text>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Tout est prêt {params.nom} 🎉
        </Text>

        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Profil</Text>
            <InfoRow label="Sexe" value={profile.sexe === 'homme' ? 'Homme' : 'Femme'} />
            <InfoRow label="Âge" value={`${profile.age} ans`} />
            <InfoRow label="Poids" value={`${profile.poids} kg`} />
            <InfoRow label="Taille" value={`${profile.taille} cm`} />
            <InfoRow label="Objectif" value={OBJECTIF_LABELS[profile.objectif] ?? profile.objectif} />
            {vitesse && <InfoRow label="Rythme" value={`${vitesse.toString().replace('.', ',')} kg/semaine`} />}
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Activité</Text>
            {sports.length === 0 || (sports.length === 1 && sports[0].type === 'aucun') ? (
              <Text variant="bodyMedium" style={{ opacity: 0.7 }}>Aucun sport régulier</Text>
            ) : (
              sports.map((s, i) => {
                const meta = SPORT_LABELS[s.type];
                return (
                  <View key={i} style={styles.infoRow}>
                    <Text variant="bodyMedium" style={{ opacity: 0.8 }}>
                      {meta?.emoji} {meta?.label ?? s.type}
                    </Text>
                    <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                      {FREQ_LABELS[s.frequence] ?? s.frequence}
                    </Text>
                  </View>
                );
              })
            )}
          </Card.Content>
        </Card>

        <Card style={styles.cardMacros} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Tes objectifs journaliers</Text>
            <MacroRow label="Calories" value={`${macros.calories} kcal`} color={theme.colors.primary} />
            <MacroRow label="Protéines" value={`${macros.proteines_g} g`} color="#4CAF50" />
            <MacroRow label="Glucides" value={`${macros.glucides_g} g`} color="#FF9800" />
            <MacroRow label="Lipides" value={`${macros.lipides_g} g`} color="#2196F3" />
            {macros.calculesSurMasseMaigre && (
              <Text variant="bodySmall" style={[styles.note, { color: theme.colors.onSurfaceVariant }]}>
                Calculé sur ta masse maigre réelle.
              </Text>
            )}
          </Card.Content>
        </Card>

        {error ? (
          <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          C'est parti !
        </Button>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="bodyMedium" style={{ opacity: 0.7 }}>{label}</Text>
      <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

function MacroRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        <Text variant="bodyMedium">{label}</Text>
      </View>
      <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24 },
  step: { opacity: 0.5, marginBottom: 8 },
  title: { fontWeight: 'bold', marginBottom: 24 },
  card: { marginBottom: 12, borderRadius: 16 },
  cardMacros: { marginBottom: 12, borderRadius: 16 },
  cardTitle: { fontWeight: '600', marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  note: { textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
  error: { textAlign: 'center', marginTop: 8 },
  footer: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 8 },
  button: { borderRadius: 12 },
  buttonContent: { paddingVertical: 8 },
});
