import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform, Alert } from 'react-native';
import { Text, Button, Card, Switch, TextInput, Portal, Modal, useTheme, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import ScrollPicker from '../components/ScrollPicker';
import { useUserStore } from '../stores/userStore';
import { useWeightStore, type WeightEntry } from '../stores/weightStore';
import { colors, spacing, radius, shadow, palette } from '../theme/tokens';
import { haptic } from '../lib/haptics';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDateFR(d: Date): string {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function dateToISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

// Plage du picker entier : large pour permettre l'import de pesees historiques
// tres differentes du poids actuel.
const POIDS_ENTIERS = Array.from({ length: 161 }, (_, i) => 40 + i); // 40 -> 200
const DECIMALES = Array.from({ length: 10 }, (_, i) => i);            // 0 -> 9

interface FeedbackData {
  ecart: number;       // poids_nouveau - poids_precedent
  joursEcoules: number;
  titre: string;
  message: string;
  emoji: string;
}

export default function PeserScreen() {
  const theme = useTheme();
  const profile = useUserStore((s) => s.profile);
  const recalculateAfterWeight = useUserStore((s) => s.recalculateAfterWeight);
  const history = useWeightStore((s) => s.history);
  const loadHistory = useWeightStore((s) => s.loadHistory);
  const addWeight = useWeightStore((s) => s.addWeight);

  // Poids initial : derniere pesee si dispo, sinon poids du profil
  const poidsDeReference = history.length > 0
    ? history[history.length - 1].poids_kg
    : profile?.poids ?? 70;

  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [poidsEntier, setPoidsEntier] = useState<number>(Math.floor(poidsDeReference));
  const [poidsDecimal, setPoidsDecimal] = useState<number>(Math.round((poidsDeReference - Math.floor(poidsDeReference)) * 10));
  const [afficheCompo, setAfficheCompo] = useState(false);
  const [grasse, setGrasse] = useState('');
  const [muscu, setMuscu] = useState('');
  const [hydro, setHydro] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadHistory(); }, []);

  const dateISO = dateToISODate(date);
  const poidsKg = poidsEntier + poidsDecimal / 10;

  // Existe-t-il deja une pesee a cette date ? (mode edition implicite via upsert)
  const peseeExistante = useMemo(
    () => history.find((h) => h.date === dateISO),
    [history, dateISO],
  );

  // Pre-remplir si on selectionne une date avec une pesee existante (sauf
  // au mount initial ou l'utilisateur n'a pas encore touche au picker).
  useEffect(() => {
    if (peseeExistante) {
      setPoidsEntier(Math.floor(peseeExistante.poids_kg));
      setPoidsDecimal(Math.round((peseeExistante.poids_kg - Math.floor(peseeExistante.poids_kg)) * 10));
      if (peseeExistante.masse_grasse_pct !== undefined) {
        setAfficheCompo(true);
        setGrasse(String(peseeExistante.masse_grasse_pct));
        setMuscu(peseeExistante.masse_musculaire_pct !== undefined ? String(peseeExistante.masse_musculaire_pct) : '');
        setHydro(peseeExistante.masse_hydrique_pct !== undefined ? String(peseeExistante.masse_hydrique_pct) : '');
      }
    }
  }, [peseeExistante?.date]);

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && selected) setDate(selected);
  };

  const handleConnectHealth = () => {
    Alert.alert(
      'Bientôt disponible',
      'L\'import depuis Apple Santé / Google Fit sera activé prochainement. Pour l\'instant, saisis ta pesée manuellement.',
      [{ text: 'OK' }],
    );
  };

  const validerComposition = (): boolean => {
    if (!afficheCompo) return true;
    const g = Number(grasse.replace(',', '.'));
    if (!grasse) return true; // composition optionnelle
    if (isNaN(g) || g < 3 || g > 60) {
      setError('La masse grasse doit être entre 3 et 60%');
      return false;
    }
    return true;
  };

  const construireFeedback = (
    nouveauPoids: number,
    derniere: WeightEntry | undefined,
    objectif: string,
  ): FeedbackData | null => {
    if (!derniere) return null;

    const ecart = Math.round((nouveauPoids - derniere.poids_kg) * 10) / 10;
    const dDerniere = new Date(derniere.date);
    const dNouvelle = new Date(dateISO);
    const joursEcoules = Math.max(1, Math.round((dNouvelle.getTime() - dDerniere.getTime()) / (1000 * 60 * 60 * 24)));

    const ecartAbs = Math.abs(ecart);

    // Stable (dans la marge des fluctuations naturelles)
    if (ecartAbs < 0.3) {
      return {
        ecart, joursEcoules, emoji: '⚖️',
        titre: 'Stable cette semaine',
        message: 'C\'est dans la marge des fluctuations naturelles (eau, digestion). Continue comme tu fais.',
      };
    }

    // Perte
    if (objectif === 'perte') {
      if (ecart < 0) {
        return {
          ecart, joursEcoules, emoji: '🎯',
          titre: `${ecartAbs.toFixed(1)} kg perdus`,
          message: 'Tu es sur la bonne voie. La régularité est ce qui compte le plus.',
        };
      }
      return {
        ecart, joursEcoules, emoji: '🌱',
        titre: `+${ecartAbs.toFixed(1)} kg cette semaine`,
        message: 'Pas d\'inquiétude, le poids fluctue naturellement. Reste régulier sur tes calories, la tendance globale compte plus qu\'une pesée.',
      };
    }

    // Prise
    if (objectif === 'prise') {
      if (ecart > 0) {
        return {
          ecart, joursEcoules, emoji: '💪',
          titre: `+${ecartAbs.toFixed(1)} kg gagnés`,
          message: 'Belle progression. Garde ton surplus calorique et tes séances.',
        };
      }
      return {
        ecart, joursEcoules, emoji: '🌱',
        titre: `${ecartAbs.toFixed(1)} kg cette semaine`,
        message: 'Le corps fluctue, surtout après une grosse séance. Continue ton surplus et la muscu.',
      };
    }

    // Maintien
    return {
      ecart, joursEcoules, emoji: ecartAbs < 1 ? '⚖️' : '📊',
      titre: ecart > 0 ? `+${ecartAbs.toFixed(1)} kg` : `${ecart.toFixed(1)} kg`,
      message: 'Reste attentif à ta tendance sur plusieurs semaines pour ajuster si besoin.',
    };
  };

  const handleSave = async () => {
    setError('');
    if (!validerComposition()) return;
    if (!profile) return;

    haptic.medium();
    setSaving(true);
    try {
      const compoFields = afficheCompo
        ? {
            masse_grasse_pct: grasse ? Number(grasse.replace(',', '.')) : undefined,
            masse_musculaire_pct: muscu ? Number(muscu.replace(',', '.')) : undefined,
            masse_hydrique_pct: hydro ? Number(hydro.replace(',', '.')) : undefined,
          }
        : {};

      // 1. Insert/update la pesee
      await addWeight({
        poids_kg: poidsKg,
        date: dateISO,
        ...compoFields,
        source: 'manuel',
      });

      // 2. Determiner si c'est la pesee la plus recente. Si oui, on recalcule
      //    les macros (et on detecte l'objectif atteint). Sinon c'est juste un
      //    import historique sans impact sur les macros actuelles.
      const datesPlusRecentes = history.filter(
        (h) => h.date > dateISO && h.date !== peseeExistante?.date,
      );
      const estLaPlusRecente = datesPlusRecentes.length === 0;

      // Avant-derniere pesee = derniere pesee d'avant celle qu'on vient de saisir
      const peseesAvant = history
        .filter((h) => h.date < dateISO)
        .sort((a, b) => a.date.localeCompare(b.date));
      const derniereAvant = peseesAvant[peseesAvant.length - 1];

      let celebrateModal = false;
      if (estLaPlusRecente) {
        const result = await recalculateAfterWeight(poidsKg);
        celebrateModal = result.celebrate;
      }

      if (celebrateModal) {
        haptic.heavy();
        setCelebrate(true);
      } else {
        haptic.success();
        const fb = construireFeedback(poidsKg, derniereAvant, profile.objectif);
        if (fb) setFeedback(fb);
        else router.back(); // Pas de comparaison possible (1ere pesee), on ferme directement
      }
    } catch (e) {
      console.error(e);
      setError('Impossible d\'enregistrer la pesée. Réessaie.');
    } finally {
      setSaving(false);
    }
  };

  const closeModalAndBack = () => {
    setFeedback(null);
    setCelebrate(false);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header simple */}
      <View style={styles.header}>
        <IconButton icon="close" size={24} onPress={() => router.back()} />
        <Text variant="titleLarge" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Pesée
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Date */}
        <Pressable
          onPress={() => setShowDatePicker(true)}
          style={[styles.dateBtn, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}
        >
          <Text style={{ fontSize: 22 }}>📅</Text>
          <View style={{ flex: 1 }}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Date de la pesée
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
              {dateISO === todayStr() ? 'Aujourd\'hui' : formatDateFR(date)}
            </Text>
          </View>
          <Text style={{ color: theme.colors.primary }}>Modifier</Text>
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
            locale="fr-FR"
          />
        )}
        {Platform.OS === 'ios' && showDatePicker && (
          <Button mode="text" onPress={() => setShowDatePicker(false)} style={{ alignSelf: 'flex-end' }}>
            Valider
          </Button>
        )}

        {/* Indication pesee deja existante */}
        {peseeExistante && (
          <Card mode="contained" style={[styles.infoCard, { backgroundColor: theme.colors.primaryContainer }]}>
            <Card.Content style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 18 }}>ℹ️</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, flex: 1 }}>
                Tu as déjà pesé ce jour-là ({peseeExistante.poids_kg} kg). Tu peux modifier la valeur.
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Pickers poids */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Mon poids
        </Text>
        <View style={styles.pickerRow}>
          <View style={{ flex: 2 }}>
            <ScrollPicker
              values={POIDS_ENTIERS}
              selected={poidsEntier}
              onSelect={setPoidsEntier}
              unit="kg"
              label="entier"
            />
          </View>
          <Text variant="displaySmall" style={[styles.dot, { color: theme.colors.onSurface }]}>,</Text>
          <View style={{ flex: 1 }}>
            <ScrollPicker
              values={DECIMALES}
              selected={poidsDecimal}
              onSelect={setPoidsDecimal}
              unit=""
              label="déc"
            />
          </View>
        </View>

        <Text variant="bodyMedium" style={[styles.poidsAffiche, { color: theme.colors.primary }]}>
          {poidsKg.toFixed(1)} kg
        </Text>

        {/* Composition corporelle (toggle) */}
        <Card mode="outlined" style={styles.compoCard}>
          <Card.Content>
            <View style={styles.compoToggleRow}>
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ fontWeight: '600' }}>
                  J'ai mesuré ma composition
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  Si tu utilises une balance impédancemètre
                </Text>
              </View>
              <Switch value={afficheCompo} onValueChange={setAfficheCompo} />
            </View>

            {afficheCompo && (
              <View style={{ marginTop: 12, gap: 8 }}>
                <TextInput
                  label="Masse grasse (%)"
                  value={grasse}
                  onChangeText={setGrasse}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  right={<TextInput.Affix text="%" />}
                  dense
                />
                <TextInput
                  label="Masse musculaire (%)"
                  value={muscu}
                  onChangeText={setMuscu}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  right={<TextInput.Affix text="%" />}
                  dense
                />
                <TextInput
                  label="Masse hydrique (%)"
                  value={hydro}
                  onChangeText={setHydro}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  right={<TextInput.Affix text="%" />}
                  dense
                />
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Import Health placeholder */}
        <Pressable
          onPress={handleConnectHealth}
          style={[styles.healthBtn, { borderColor: theme.colors.primary }]}
        >
          <Text style={{ fontSize: 18 }}>❤️</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '600' }}>
            Importer depuis Apple Santé / Google Fit
          </Text>
        </Pressable>

        {error ? (
          <Text style={{ color: theme.colors.error, textAlign: 'center', marginTop: 8 }}>{error}</Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveBtn}
          contentStyle={{ paddingVertical: 8 }}
        >
          Enregistrer
        </Button>
      </View>

      {/* Modal feedback comparatif */}
      <Portal>
        <Modal
          visible={feedback !== null}
          onDismiss={closeModalAndBack}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          {feedback && (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 56, marginBottom: 8 }}>{feedback.emoji}</Text>
              <Text variant="headlineSmall" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                {feedback.titre}
              </Text>
              <Text variant="bodyMedium" style={[styles.modalMsg, { color: theme.colors.onSurfaceVariant }]}>
                {feedback.message}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24 }}>
                Sur les {feedback.joursEcoules} derniers jours
              </Text>
              <Button mode="contained" onPress={closeModalAndBack} style={styles.modalBtn}>
                Continuer
              </Button>
            </View>
          )}
        </Modal>
      </Portal>

      {/* Modal celebration objectif atteint */}
      <Portal>
        <Modal
          visible={celebrate}
          onDismiss={closeModalAndBack}
          dismissable={false}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 64, marginBottom: 8 }}>🎯</Text>
            <Text variant="headlineSmall" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              Tu as atteint ton objectif
            </Text>
            <Text variant="bodyMedium" style={[styles.modalMsg, { color: theme.colors.onSurfaceVariant }]}>
              Tu visais {profile?.poids_objectif} kg, tu y es. Bravo, c'est une vraie réussite.
              {'\n\n'}
              Tes objectifs caloriques passent automatiquement en mode <Text style={{ fontWeight: '700' }}>maintien</Text>.
            </Text>
            <Button mode="contained" onPress={closeModalAndBack} style={styles.modalBtn}>
              Maintenir ce poids
            </Button>
            <Button
              mode="text"
              onPress={() => { closeModalAndBack(); router.push('/(tabs)/profil'); }}
              style={{ marginTop: 4 }}
            >
              Définir un nouvel objectif
            </Button>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerTitle: { fontWeight: '600' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  infoCard: { borderRadius: 12, marginBottom: 12 },
  sectionTitle: { fontWeight: '600', marginTop: 8, marginBottom: 8, textAlign: 'center' },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: { fontWeight: 'bold', marginTop: 22 },
  poidsAffiche: { textAlign: 'center', fontWeight: '600', marginTop: -8, marginBottom: 16 },
  compoCard: { borderRadius: 16, marginBottom: 12 },
  compoToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  healthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  footer: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 },
  saveBtn: { borderRadius: 12 },

  modal: {
    margin: 16,
    padding: 28,
    borderRadius: 24,
  },
  modalTitle: { fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  modalMsg: { textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  modalBtn: { borderRadius: 12, alignSelf: 'stretch' },
});
