import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingMensurationsScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ objectif: string }>();

  const [nom, setNom] = useState('');
  const [age, setAge] = useState('');
  const [poids, setPoids] = useState('');
  const [taille, setTaille] = useState('');
  const [sexe, setSexe] = useState<'homme' | 'femme' | ''>('');

  const isValid = nom && age && poids && taille && sexe;

  const handleNext = () => {
    router.push({
      pathname: '/(auth)/onboarding-activite',
      params: {
        objectif: params.objectif,
        nom,
        age,
        poids,
        taille,
        sexe,
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="titleMedium" style={styles.step}>Étape 2/4</Text>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Tes mensurations
        </Text>

        <TextInput
          label="Prénom"
          value={nom}
          onChangeText={setNom}
          mode="outlined"
          autoCapitalize="words"
          style={styles.input}
        />

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
                <Text
                  variant="titleMedium"
                  style={{
                    textAlign: 'center',
                    color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                  }}
                >
                  {s === 'homme' ? 'Homme' : 'Femme'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          label="Âge"
          value={age}
          onChangeText={setAge}
          mode="outlined"
          keyboardType="numeric"
          right={<TextInput.Affix text="ans" />}
          style={styles.input}
        />

        <View style={styles.row}>
          <TextInput
            label="Poids"
            value={poids}
            onChangeText={setPoids}
            mode="outlined"
            keyboardType="decimal-pad"
            right={<TextInput.Affix text="kg" />}
            style={[styles.input, { flex: 1 }]}
          />
          <View style={{ width: 12 }} />
          <TextInput
            label="Taille"
            value={taille}
            onChangeText={setTaille}
            mode="outlined"
            keyboardType="numeric"
            right={<TextInput.Affix text="cm" />}
            style={[styles.input, { flex: 1 }]}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleNext}
          disabled={!isValid}
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
  input: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  sexeOption: {
    padding: 16,
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
