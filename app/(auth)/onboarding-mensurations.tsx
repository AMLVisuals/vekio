import { useState } from 'react';
import { View, StyleSheet, Pressable, Keyboard } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScrollPicker from '../../components/ScrollPicker';

// Generer les valeurs pour les pickers
const AGES = Array.from({ length: 82 }, (_, i) => i + 14); // 14-95
const POIDS = Array.from({ length: 161 }, (_, i) => i + 40); // 40-200
const TAILLES = Array.from({ length: 81 }, (_, i) => i + 120); // 120-200

export default function OnboardingMensurationsScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ objectif: string }>();

  const [nom, setNom] = useState('');
  const [age, setAge] = useState(25);
  const [poids, setPoids] = useState(70);
  const [taille, setTaille] = useState(170);
  const [sexe, setSexe] = useState<'homme' | 'femme' | ''>('');
  const [step, setStep] = useState<'info' | 'age' | 'poids' | 'taille'>('info');

  const handleNext = () => {
    if (step === 'info') {
      if (!nom || !sexe) return;
      setStep('age');
    } else if (step === 'age') {
      setStep('poids');
    } else if (step === 'poids') {
      setStep('taille');
    } else {
      router.push({
        pathname: '/(auth)/onboarding-activite',
        params: {
          objectif: params.objectif,
          nom,
          age: String(age),
          poids: String(poids),
          taille: String(taille),
          sexe,
        },
      });
    }
  };

  const canContinue = step === 'info' ? (nom && sexe) : true;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.content}>
          <Text variant="titleMedium" style={styles.step}>Étape 2/4</Text>

          {step === 'info' && (
            <>
              <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
                Comment tu t'appelles ?
              </Text>

              <TextInput
                label="Prénom"
                value={nom}
                onChangeText={setNom}
                mode="outlined"
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                style={styles.input}
              />

              <Text variant="titleMedium" style={[styles.subtitle, { color: theme.colors.onBackground }]}>
                Tu es ?
              </Text>

              <View style={styles.row}>
                {(['homme', 'femme'] as const).map((s) => {
                  const isSelected = sexe === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setSexe(s)}
                      style={[
                        styles.sexeOption,
                        {
                          borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
                          backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface,
                          flex: 1,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 32, textAlign: 'center' }}>
                        {s === 'homme' ? '👨' : '👩'}
                      </Text>
                      <Text
                        variant="titleMedium"
                        style={{
                          textAlign: 'center',
                          marginTop: 8,
                          color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                        }}
                      >
                        {s === 'homme' ? 'Homme' : 'Femme'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {step === 'age' && (
            <>
              <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
                Quel âge as-tu ?
              </Text>
              <ScrollPicker
                values={AGES}
                selected={age}
                onSelect={setAge}
                unit="ans"
                label="Âge"
              />
            </>
          )}

          {step === 'poids' && (
            <>
              <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
                Quel est ton poids ?
              </Text>
              <ScrollPicker
                values={POIDS}
                selected={poids}
                onSelect={setPoids}
                unit="kg"
                label="Poids"
              />
            </>
          )}

          {step === 'taille' && (
            <>
              <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
                Quelle est ta taille ?
              </Text>
              <ScrollPicker
                values={TAILLES}
                selected={taille}
                onSelect={setTaille}
                unit="cm"
                label="Taille"
              />
            </>
          )}
        </View>

        <View style={styles.footer}>
          {step !== 'info' && (
            <Button
              mode="text"
              onPress={() => {
                if (step === 'age') setStep('info');
                else if (step === 'poids') setStep('age');
                else if (step === 'taille') setStep('poids');
              }}
              style={{ marginBottom: 8 }}
            >
              Retour
            </Button>
          )}
          <Button
            mode="contained"
            onPress={handleNext}
            disabled={!canContinue}
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
  subtitle: {
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  sexeOption: {
    padding: 20,
    borderRadius: 16,
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
