import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, IconButton, useTheme } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { calculateAge, suggererPoidsCible, type Intention, type Objectif } from '../../lib/nutrition';

const MIN_DATE = new Date(1925, 0, 1);
const MAX_DATE = new Date(new Date().getFullYear() - 14, 11, 31); // 14 ans min

function formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function OnboardingProfilScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ objectif: string; vitesse: string; intention: string }>();
  const objectif = params.objectif as Objectif;
  const intention = (params.intention || undefined) as Intention | undefined;
  const needsCible = objectif === 'perte' || objectif === 'prise';

  const [nom, setNom] = useState('');
  const [sexe, setSexe] = useState<'homme' | 'femme' | ''>('');
  const [dateNaissance, setDateNaissance] = useState<Date>(new Date(1995, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [poids, setPoids] = useState('');
  const [taille, setTaille] = useState('');
  const [poidsCible, setPoidsCible] = useState('');
  const [sansCible, setSansCible] = useState(false);
  const [cibleEditeManuellement, setCibleEditeManuellement] = useState(false);

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && selected) setDateNaissance(selected);
  };

  const handleConnectHealth = () => {
    Alert.alert(
      'Bientôt disponible',
      'La connexion Apple Santé / Google Fit sera activée dans la prochaine mise à jour. Pour l\'instant tu peux remplir manuellement.',
      [{ text: 'OK' }],
    );
  };

  const age = calculateAge(dateNaissance);
  const poidsN = Number(poids.replace(',', '.'));
  const tailleN = Number(taille.replace(',', '.'));
  const cibleN = Number(poidsCible.replace(',', '.'));

  // Pre-remplit la cible automatiquement quand le poids est saisi, tant que
  // l'utilisateur n'a pas encore touche le champ ni declare "pas de cible".
  useEffect(() => {
    if (!needsCible || sansCible || cibleEditeManuellement) return;
    if (poidsN > 30 && poidsN < 250) {
      const suggestion = suggererPoidsCible(poidsN, objectif, intention);
      setPoidsCible(String(suggestion));
    }
  }, [poidsN, objectif, intention, needsCible, sansCible, cibleEditeManuellement]);

  const cibleValide =
    !needsCible ||
    sansCible ||
    (cibleN > 30 && cibleN < 250 && (
      objectif === 'perte' ? cibleN < poidsN : cibleN > poidsN
    ));

  const canContinue =
    nom.trim() && sexe && poidsN > 30 && poidsN < 250 && tailleN > 100 && tailleN < 230 && cibleValide;

  const handleNext = () => {
    router.push({
      pathname: '/(auth)/onboarding-composition',
      params: {
        objectif: params.objectif,
        vitesse: params.vitesse,
        intention: params.intention ?? '',
        nom: nom.trim(),
        sexe,
        dateNaissance: dateNaissance.toISOString(),
        age: String(age),
        poids: String(poidsN),
        taille: String(tailleN),
        poids_objectif: needsCible && !sansCible ? String(cibleN) : '',
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.topBar}>
        <IconButton icon="arrow-left" size={24} onPress={() => router.back()} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="titleMedium" style={styles.step}>Étape 2/5</Text>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Parle-nous de toi
        </Text>

        {/* Bouton Health */}
        <Pressable onPress={handleConnectHealth} style={[styles.healthBtn, { borderColor: theme.colors.primary }]}>
          <Text style={{ fontSize: 20 }}>❤️</Text>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ fontWeight: '600', color: theme.colors.primary }}>
              Connecter Apple Santé / Google Fit
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              Synchronise poids, composition et activité automatiquement
            </Text>
          </View>
        </Pressable>

        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>ou remplir à la main</Text>
          <View style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]} />
        </View>

        {/* Prenom */}
        <TextInput
          label="Prénom"
          value={nom}
          onChangeText={setNom}
          mode="outlined"
          autoCapitalize="words"
          returnKeyType="done"
          style={styles.input}
        />

        {/* Sexe */}
        <Text variant="bodyMedium" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Sexe</Text>
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
                    borderColor: isSelected ? theme.colors.primary : theme.colors.outlineVariant,
                    backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface,
                  },
                ]}
              >
                <Text style={{ fontSize: 28, textAlign: 'center' }}>{s === 'homme' ? '👨' : '👩'}</Text>
                <Text
                  variant="titleSmall"
                  style={{
                    textAlign: 'center',
                    marginTop: 4,
                    fontWeight: '600',
                    color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                  }}
                >
                  {s === 'homme' ? 'Homme' : 'Femme'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Date de naissance */}
        <Text variant="bodyMedium" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Date de naissance</Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          style={[styles.dateInput, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            {formatDate(dateNaissance)}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {age} ans
          </Text>
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={dateNaissance}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={MIN_DATE}
            maximumDate={MAX_DATE}
            locale="fr-FR"
          />
        )}

        {Platform.OS === 'ios' && showDatePicker && (
          <Button mode="text" onPress={() => setShowDatePicker(false)} style={{ alignSelf: 'flex-end' }}>
            Valider
          </Button>
        )}

        {/* Poids et taille */}
        <View style={[styles.row, { marginTop: 8 }]}>
          <TextInput
            label="Poids (kg)"
            value={poids}
            onChangeText={setPoids}
            mode="outlined"
            keyboardType="decimal-pad"
            returnKeyType="done"
            style={[styles.input, { flex: 1 }]}
          />
          <TextInput
            label="Taille (cm)"
            value={taille}
            onChangeText={setTaille}
            mode="outlined"
            keyboardType="decimal-pad"
            returnKeyType="done"
            style={[styles.input, { flex: 1 }]}
          />
        </View>

        {/* Poids cible — uniquement en perte ou prise */}
        {needsCible && (
          <View style={styles.cibleBlock}>
            <Text variant="titleMedium" style={[styles.cibleTitle, { color: theme.colors.onBackground }]}>
              Ton poids cible
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10 }}>
              {objectif === 'perte'
                ? 'Le poids que tu aimerais atteindre. On adaptera tes calories quand tu y seras.'
                : 'Le poids que tu vises. On stoppera le surplus calorique une fois atteint.'}
            </Text>
            {!sansCible ? (
              <>
                <TextInput
                  label="Poids cible (kg)"
                  value={poidsCible}
                  onChangeText={(v) => { setPoidsCible(v); setCibleEditeManuellement(true); }}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  style={styles.input}
                />
                {poidsN > 30 && cibleN > 30 && !cibleValide && (
                  <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
                    {objectif === 'perte'
                      ? 'La cible doit être inférieure au poids actuel.'
                      : 'La cible doit être supérieure au poids actuel.'}
                  </Text>
                )}
                <Pressable onPress={() => { setSansCible(true); setPoidsCible(''); }}>
                  <Text variant="bodySmall" style={[styles.skipLink, { color: theme.colors.primary }]}>
                    Je n'ai pas de cible précise
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={[styles.sansCibleBox, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceVariant }]}
                onPress={() => { setSansCible(false); setCibleEditeManuellement(false); }}
              >
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                  Pas de cible précise
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  Touche ici pour en définir une
                </Text>
              </Pressable>
            )}
          </View>
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
  title: { fontWeight: 'bold', marginBottom: 24 },
  healthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  line: { flex: 1, height: 1 },
  label: { fontWeight: '500', marginBottom: 8, marginTop: 4 },
  input: { marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  sexeOption: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
  },
  dateInput: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cibleBlock: { marginTop: 16 },
  cibleTitle: { fontWeight: '600', marginBottom: 6 },
  skipLink: { textAlign: 'right', textDecorationLine: 'underline', marginTop: -4, marginBottom: 4 },
  sansCibleBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  footer: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 8 },
  button: { borderRadius: 12 },
  buttonContent: { paddingVertical: 8 },
});
