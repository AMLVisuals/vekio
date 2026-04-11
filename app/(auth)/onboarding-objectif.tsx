import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const OBJECTIFS = [
  { value: 'perte', label: 'Perdre du poids', description: 'Un programme adapté pour atteindre ton objectif' },
  { value: 'maintien', label: 'Maintenir mon poids', description: 'Garde ton équilibre au quotidien' },
  { value: 'prise', label: 'Prendre du poids', description: 'Augmente ta masse progressivement' },
] as const;

export default function OnboardingObjectifScreen() {
  const theme = useTheme();
  const [selected, setSelected] = useState<string>('');

  const handleNext = () => {
    router.push({
      pathname: '/(auth)/onboarding-mensurations',
      params: { objectif: selected },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="titleMedium" style={styles.step}>Étape 1/4</Text>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Quel est ton objectif ?
        </Text>

        <View style={styles.options}>
          {OBJECTIFS.map((obj) => {
            const isSelected = selected === obj.value;
            return (
              <Pressable
                key={obj.value}
                onPress={() => setSelected(obj.value)}
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
                  {obj.label}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant, marginTop: 4 }}
                >
                  {obj.description}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

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
