import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calculateNeeds } from '../../lib/nutrition';
import { useUserStore } from '../../stores/userStore';
import { useWeightStore } from '../../stores/weightStore';
import { requestNotificationPermission, scheduleLocalReminders } from '../../lib/notifications';
import type { Profile } from '../../lib/nutrition';

const OBJECTIF_LABELS: Record<string, string> = {
  perte: 'Perdre du poids',
  maintien: 'Maintenir mon poids',
  prise: 'Prendre du poids',
};

const ACTIVITE_LABELS: Record<string, string> = {
  sedentaire: 'Sédentaire',
  leger: 'Légèrement actif',
  modere: 'Modérément actif',
  actif: 'Actif',
  tres_actif: 'Très actif',
};

export default function OnboardingRecapScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{
    objectif: string;
    nom: string;
    age: string;
    poids: string;
    taille: string;
    sexe: string;
    activite: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const profileData: Profile = {
    sexe: params.sexe as Profile['sexe'],
    age: Number(params.age),
    poids: Number(params.poids),
    taille: Number(params.taille),
    activite: params.activite as Profile['activite'],
    objectif: params.objectif as Profile['objectif'],
  };

  const macros = calculateNeeds(profileData);

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      await useUserStore.getState().saveProfile({
        nom: params.nom,
        email: '',
        age: Number(params.age),
        poids: Number(params.poids),
        taille: Number(params.taille),
        sexe: params.sexe as Profile['sexe'],
        activite: params.activite as Profile['activite'],
        objectif: params.objectif as Profile['objectif'],
      });

      // Enregistrer le poids initial dans l'historique
      await useWeightStore.getState().addWeight(Number(params.poids));

      // Demander la permission et programmer les rappels
      const granted = await requestNotificationPermission();
      if (granted) {
        await scheduleLocalReminders();
      }

      router.replace('/(tabs)');
    } catch (e) {
      setError('Erreur lors de la sauvegarde. Réessaie.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text variant="titleMedium" style={styles.step}>Étape 4/4</Text>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Ton récapitulatif
        </Text>

        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 12 }}>Profil</Text>
            <InfoRow label="Prénom" value={params.nom} />
            <InfoRow label="Sexe" value={params.sexe === 'homme' ? 'Homme' : 'Femme'} />
            <InfoRow label="Âge" value={`${params.age} ans`} />
            <InfoRow label="Poids" value={`${params.poids} kg`} />
            <InfoRow label="Taille" value={`${params.taille} cm`} />
            <InfoRow label="Activité" value={ACTIVITE_LABELS[params.activite] ?? params.activite} />
            <InfoRow label="Objectif" value={OBJECTIF_LABELS[params.objectif] ?? params.objectif} />
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 12 }}>Tes objectifs journaliers</Text>
            <MacroRow label="Calories" value={`${macros.calories} kcal`} color={theme.colors.primary} />
            <MacroRow label="Protéines" value={`${macros.proteines_g} g`} color="#4CAF50" />
            <MacroRow label="Glucides" value={`${macros.glucides_g} g`} color="#FF9800" />
            <MacroRow label="Lipides" value={`${macros.lipides_g} g`} color="#2196F3" />
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
      <Text variant="bodyMedium" style={{ opacity: 0.6 }}>{label}</Text>
      <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

function MacroRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
        <Text variant="bodyMedium">{label}</Text>
      </View>
      <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  step: {
    opacity: 0.5,
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  error: {
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  button: {
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});
