import { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACTIVITES = [
  { value: 'sedentaire', label: 'Sédentaire', description: 'Peu ou pas d\'exercice, travail de bureau' },
  { value: 'leger', label: 'Légèrement actif', description: 'Exercice léger 1 à 3 fois/semaine' },
  { value: 'modere', label: 'Modérément actif', description: 'Exercice modéré 3 à 5 fois/semaine' },
  { value: 'actif', label: 'Actif', description: 'Exercice intense 6 à 7 fois/semaine' },
  { value: 'tres_actif', label: 'Très actif', description: 'Exercice très intense ou travail physique' },
] as const;

export default function OnboardingActiviteScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{
    objectif: string;
    nom: string;
    age: string;
    poids: string;
    taille: string;
    sexe: string;
  }>();

  const [selected, setSelected] = useState<string>('');

  const handleNext = () => {
    router.push({
      pathname: '/(auth)/onboarding-recap',
      params: {
        ...params,
        activite: selected,
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text variant="titleMedium" style={styles.step}>Étape 3/4</Text>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Ton niveau d'activité
        </Text>

        <View style={styles.options}>
          {ACTIVITES.map((act) => {
            const isSelected = selected === act.value;
            return (
              <Pressable
                key={act.value}
                onPress={() => setSelected(act.value)}
                style={[
                  styles.option,
                  {
                    borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
                    backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface,
                  },
                ]}
              >
                <Text
                  variant="titleMedium"
                  style={{ color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}
                >
                  {act.label}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant, marginTop: 4 }}
                >
                  {act.description}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleNext}
          disabled={!selected}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Suivant
        </Button>
      </View>
    </SafeAreaView>
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
  },
  step: {
    opacity: 0.5,
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 32,
  },
  options: {
    gap: 12,
    paddingBottom: 24,
  },
  option: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
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
