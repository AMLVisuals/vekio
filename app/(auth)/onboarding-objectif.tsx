import { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const OBJECTIFS = [
  { value: 'perte', label: 'Perdre du poids', emoji: '🔥', description: 'Atteindre un poids cible en douceur' },
  { value: 'maintien', label: 'Maintenir mon poids', emoji: '⚖️', description: 'Garder mon équilibre actuel' },
  { value: 'prise', label: 'Prendre de la masse', emoji: '💪', description: 'Construire du muscle progressivement' },
] as const;

const VITESSES = [
  { value: '0.25', label: 'Doucement', detail: '0,25 kg/semaine', tip: 'La plus durable' },
  { value: '0.5',  label: 'Régulièrement', detail: '0,5 kg/semaine', tip: 'Le bon compromis' },
  { value: '0.75', label: 'Rapidement', detail: '0,75 kg/semaine', tip: 'Demande de la rigueur' },
] as const;

const INTENTIONS = [
  { value: 'bien_etre',  label: 'Me sentir mieux',     emoji: '🌱', description: 'Bien-être global, sans pression' },
  { value: 'silhouette', label: 'Affiner ma silhouette', emoji: '✨', description: 'Perdre du gras, gagner en aisance' },
  { value: 'tonique',    label: 'Devenir plus tonique',  emoji: '💪', description: 'Construire du muscle visible' },
] as const;

export default function OnboardingObjectifScreen() {
  const theme = useTheme();
  const [objectif, setObjectif] = useState<string>('');
  const [vitesse, setVitesse] = useState<string>('0.5');
  const [intention, setIntention] = useState<string>('');

  const needsVitesse = objectif === 'perte' || objectif === 'prise';
  const needsIntention = needsVitesse;
  const canContinue = objectif && (!needsVitesse || vitesse) && (!needsIntention || intention);

  const handleNext = () => {
    router.push({
      pathname: '/(auth)/onboarding-mensurations',
      params: {
        objectif,
        vitesse: needsVitesse ? vitesse : '0',
        intention: needsIntention ? intention : '',
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="titleMedium" style={styles.step}>Étape 1/5</Text>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Quel est ton objectif ?
        </Text>

        <View style={styles.options}>
          {OBJECTIFS.map((obj) => {
            const isSelected = objectif === obj.value;
            return (
              <Pressable
                key={obj.value}
                onPress={() => setObjectif(obj.value)}
                style={[
                  styles.option,
                  {
                    borderColor: isSelected ? theme.colors.primary : theme.colors.outlineVariant,
                    backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface,
                  },
                ]}
              >
                <View style={styles.optionRow}>
                  <Text style={styles.emoji}>{obj.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      variant="titleMedium"
                      style={{
                        fontWeight: '600',
                        color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                      }}
                    >
                      {obj.label}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{
                        color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
                        marginTop: 2,
                      }}
                    >
                      {obj.description}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {needsVitesse && (
          <>
            <Text variant="titleMedium" style={[styles.subtitle, { color: theme.colors.onBackground }]}>
              À quelle vitesse ?
            </Text>
            <View style={styles.options}>
              {VITESSES.map((v) => {
                const isSelected = vitesse === v.value;
                return (
                  <Pressable
                    key={v.value}
                    onPress={() => setVitesse(v.value)}
                    style={[
                      styles.option,
                      {
                        borderColor: isSelected ? theme.colors.primary : theme.colors.outlineVariant,
                        backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text
                          variant="titleMedium"
                          style={{
                            fontWeight: '600',
                            color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                          }}
                        >
                          {v.label}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={{
                            color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
                            marginTop: 2,
                          }}
                        >
                          {v.detail} · {v.tip}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {needsIntention && (
          <>
            <Text variant="titleMedium" style={[styles.subtitle, { color: theme.colors.onBackground }]}>
              Ton intention ?
            </Text>
            <Text variant="bodySmall" style={[styles.subtitleHelper, { color: theme.colors.onSurfaceVariant }]}>
              Le « pourquoi » derrière ton objectif. Ça nous aide à personnaliser tes conseils.
            </Text>
            <View style={styles.options}>
              {INTENTIONS.map((i) => {
                const isSelected = intention === i.value;
                return (
                  <Pressable
                    key={i.value}
                    onPress={() => setIntention(i.value)}
                    style={[
                      styles.option,
                      {
                        borderColor: isSelected ? theme.colors.primary : theme.colors.outlineVariant,
                        backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface,
                      },
                    ]}
                  >
                    <View style={styles.optionRow}>
                      <Text style={styles.emoji}>{i.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          variant="titleMedium"
                          style={{
                            fontWeight: '600',
                            color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                          }}
                        >
                          {i.label}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={{
                            color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
                            marginTop: 2,
                          }}
                        >
                          {i.description}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
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
  container: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  step: { opacity: 0.5, marginBottom: 8 },
  title: { fontWeight: 'bold', marginBottom: 24 },
  subtitle: { fontWeight: '600', marginTop: 28, marginBottom: 6 },
  subtitleHelper: { marginBottom: 14, lineHeight: 18 },
  options: { gap: 12 },
  option: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  emoji: { fontSize: 28 },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
  button: { borderRadius: 12 },
  buttonContent: { paddingVertical: 8 },
});
