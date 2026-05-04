import { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text, Button, IconButton, useTheme } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SportType, Frequence } from '../../lib/nutrition';

interface SportOption {
  type: SportType;
  label: string;
  emoji: string;
}

const SPORTS: SportOption[] = [
  { type: 'musculation', label: 'Musculation', emoji: '🏋️' },
  { type: 'cardio',      label: 'Cardio',      emoji: '🏃' },
  { type: 'collectif',   label: 'Sport collectif', emoji: '⚽' },
  { type: 'martial',     label: 'Boxe / Arts martiaux', emoji: '🥋' },
  { type: 'yoga',        label: 'Yoga / Pilates', emoji: '🧘' },
  { type: 'autre',       label: 'Autre',       emoji: '🏅' },
  { type: 'aucun',       label: 'Aucun',       emoji: '😴' },
];

const FREQUENCES: Frequence[] = [1, 2, 3, 4, 5, 6, 7];

export default function OnboardingActiviteScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<Record<string, string>>();

  // Map type -> frequence (undefined = pas selectionne)
  const [sports, setSports] = useState<Map<SportType, Frequence>>(new Map());

  const toggleSport = (type: SportType) => {
    const next = new Map(sports);
    if (type === 'aucun') {
      // "Aucun" exclut tout le reste
      if (next.has('aucun')) next.clear();
      else { next.clear(); next.set('aucun', 1); }
    } else {
      next.delete('aucun');
      if (next.has(type)) next.delete(type);
      else next.set(type, 3); // 3 jours/sem par defaut
    }
    setSports(next);
  };

  const setFrequence = (type: SportType, freq: Frequence) => {
    const next = new Map(sports);
    next.set(type, freq);
    setSports(next);
  };

  const canContinue = sports.size > 0;

  const handleNext = () => {
    const sportsArray = Array.from(sports.entries()).map(([type, frequence]) => ({ type, frequence }));
    router.push({
      pathname: '/(auth)/onboarding-recap',
      params: {
        ...params,
        sports: JSON.stringify(sportsArray),
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.topBar}>
        <IconButton icon="arrow-left" size={24} onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="titleMedium" style={styles.step}>Étape 4/5</Text>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Quels sports tu pratiques ?
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Sélectionne tout ce qui s'applique
        </Text>

        {/* Tags sports */}
        <View style={styles.tagsRow}>
          {SPORTS.map((s) => {
            const isSelected = sports.has(s.type);
            return (
              <Pressable
                key={s.type}
                onPress={() => toggleSport(s.type)}
                style={[
                  styles.tag,
                  {
                    borderColor: isSelected ? theme.colors.primary : theme.colors.outlineVariant,
                    backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface,
                  },
                ]}
              >
                <Text style={{ fontSize: 18 }}>{s.emoji}</Text>
                <Text
                  variant="bodyMedium"
                  style={{
                    fontWeight: '500',
                    color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                  }}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Frequences pour chaque sport selectionne */}
        {sports.size > 0 && !sports.has('aucun') && (
          <>
            <Text variant="titleMedium" style={[styles.subSection, { color: theme.colors.onBackground }]}>
              Combien de fois par semaine ?
            </Text>
            {Array.from(sports.entries()).map(([type, freq]) => {
              const sport = SPORTS.find((s) => s.type === type)!;
              return (
                <View key={type} style={styles.freqBlock}>
                  <View style={styles.freqHeader}>
                    <Text style={{ fontSize: 18 }}>{sport.emoji}</Text>
                    <Text variant="titleSmall" style={{ fontWeight: '600', flex: 1 }}>{sport.label}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {freq} jour{freq > 1 ? 's' : ''} / sem
                    </Text>
                  </View>
                  <View style={styles.freqRow}>
                    {FREQUENCES.map((f) => {
                      const isSelected = freq === f;
                      return (
                        <Pressable
                          key={f}
                          onPress={() => setFrequence(type, f)}
                          style={[
                            styles.freqOption,
                            {
                              borderColor: isSelected ? theme.colors.primary : theme.colors.outlineVariant,
                              backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                            },
                          ]}
                        >
                          <Text
                            variant="bodyMedium"
                            style={{
                              fontWeight: '600',
                              color: isSelected ? '#FFFFFF' : theme.colors.onSurfaceVariant,
                            }}
                          >
                            {f}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
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
  topBar: { paddingHorizontal: 8, paddingTop: 4 },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  step: { opacity: 0.5, marginBottom: 8 },
  title: { fontWeight: 'bold', marginBottom: 4 },
  subtitle: { marginBottom: 20 },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 2,
  },
  subSection: { fontWeight: '600', marginTop: 28, marginBottom: 12 },
  freqBlock: { marginBottom: 16 },
  freqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  footer: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 8 },
  button: { borderRadius: 12 },
  buttonContent: { paddingVertical: 8 },
});
