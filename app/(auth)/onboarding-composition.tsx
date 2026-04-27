import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, useTheme } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingCompositionScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<Record<string, string>>();

  const [masseGrasse, setMasseGrasse] = useState('');
  const [masseMusculaire, setMasseMusculaire] = useState('');
  const [masseHydrique, setMasseHydrique] = useState('');

  const skip = () => {
    router.push({
      pathname: '/(auth)/onboarding-activite',
      params,
    });
  };

  const next = () => {
    const grasse = Number(masseGrasse.replace(',', '.'));
    const muscu  = Number(masseMusculaire.replace(',', '.'));
    const hydro  = Number(masseHydrique.replace(',', '.'));

    router.push({
      pathname: '/(auth)/onboarding-activite',
      params: {
        ...params,
        masse_grasse_pct: !isNaN(grasse) && grasse > 0 ? String(grasse) : '',
        masse_musculaire_pct: !isNaN(muscu) && muscu > 0 ? String(muscu) : '',
        masse_hydrique_pct: !isNaN(hydro) && hydro > 0 ? String(hydro) : '',
      },
    });
  };

  // Au moins masse grasse renseignee = peut continuer (les autres sont bonus)
  const grasseN = Number(masseGrasse.replace(',', '.'));
  const canContinue = !isNaN(grasseN) && grasseN > 3 && grasseN < 60;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="titleMedium" style={styles.step}>Étape 3/5</Text>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Tu connais ta composition ?
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Si tu as une balance impédancemètre ou un récent bilan corporel, renseigne ces valeurs pour des macros plus précises (calculées sur ta masse maigre).
        </Text>

        <Card mode="outlined" style={[styles.infoCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={{ fontSize: 22 }}>💡</Text>
            <View style={{ flex: 1 }}>
              <Text variant="titleSmall" style={{ fontWeight: '600', color: theme.colors.onPrimaryContainer }}>
                Aucune idée ?
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, marginTop: 4 }}>
                Pas de souci, tu peux passer cette étape. On les utilisera plus tard si tu connectes Apple Santé ou Google Fit, ou via tes pesées hebdomadaires.
              </Text>
            </View>
          </Card.Content>
        </Card>

        <TextInput
          label="Masse grasse (%)"
          value={masseGrasse}
          onChangeText={setMasseGrasse}
          mode="outlined"
          keyboardType="decimal-pad"
          right={<TextInput.Affix text="%" />}
          placeholder="ex : 18"
          style={styles.input}
        />

        <Text variant="bodySmall" style={[styles.helper, { color: theme.colors.onSurfaceVariant }]}>
          Indicatif : homme actif 10-20%, femme active 18-28%
        </Text>

        <TextInput
          label="Masse musculaire (%) — optionnel"
          value={masseMusculaire}
          onChangeText={setMasseMusculaire}
          mode="outlined"
          keyboardType="decimal-pad"
          right={<TextInput.Affix text="%" />}
          placeholder="ex : 42"
          style={styles.input}
        />

        <TextInput
          label="Masse hydrique (%) — optionnel"
          value={masseHydrique}
          onChangeText={setMasseHydrique}
          mode="outlined"
          keyboardType="decimal-pad"
          right={<TextInput.Affix text="%" />}
          placeholder="ex : 55"
          style={styles.input}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button mode="text" onPress={skip} style={{ marginBottom: 8 }}>
          Plus tard
        </Button>
        <Button
          mode="contained"
          onPress={next}
          disabled={!canContinue}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Continuer
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24 },
  step: { opacity: 0.5, marginBottom: 8 },
  title: { fontWeight: 'bold', marginBottom: 8 },
  subtitle: { marginBottom: 20, lineHeight: 20 },
  infoCard: { marginBottom: 20, borderRadius: 12 },
  input: { marginBottom: 4 },
  helper: { marginBottom: 16, marginLeft: 4, fontStyle: 'italic' },
  footer: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 8 },
  button: { borderRadius: 12 },
  buttonContent: { paddingVertical: 8 },
});
