import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Card, IconButton, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useWeightStore } from '../stores/weightStore';

interface Ligne {
  id: string;
  date: Date;
  poids: string;
  showPicker: boolean;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function formatDateFR(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function dateToISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

// Date par defaut : il y a 1 mois (point de depart logique pour un import)
function defaultStartDate(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d;
}

export default function ImportPeseesScreen() {
  const theme = useTheme();
  const addWeight = useWeightStore((s) => s.addWeight);

  const [lignes, setLignes] = useState<Ligne[]>([
    { id: makeId(), date: defaultStartDate(), poids: '', showPicker: false },
  ]);
  const [saving, setSaving] = useState(false);

  const ajouterLigne = () => {
    // Decale d'un mois en arriere depuis la derniere ligne pour suggerer une chronologie
    const derniere = lignes[lignes.length - 1];
    const newDate = new Date(derniere.date);
    newDate.setMonth(newDate.getMonth() - 1);
    setLignes([...lignes, { id: makeId(), date: newDate, poids: '', showPicker: false }]);
  };

  const supprimerLigne = (id: string) => {
    if (lignes.length === 1) return; // Toujours au moins une ligne
    setLignes(lignes.filter((l) => l.id !== id));
  };

  const setLignePoids = (id: string, poids: string) => {
    setLignes(lignes.map((l) => l.id === id ? { ...l, poids } : l));
  };

  const setLigneDate = (id: string, date: Date) => {
    setLignes(lignes.map((l) => l.id === id ? { ...l, date, showPicker: Platform.OS === 'ios' } : l));
  };

  const togglePicker = (id: string, show: boolean) => {
    setLignes(lignes.map((l) => l.id === id ? { ...l, showPicker: show } : l));
  };

  const lignesValides = lignes.filter((l) => {
    const p = Number(l.poids.replace(',', '.'));
    return !isNaN(p) && p > 30 && p < 250;
  });

  const handleImport = async () => {
    if (lignesValides.length === 0) {
      Alert.alert('Rien à importer', 'Renseigne au moins une pesée avec un poids valide.');
      return;
    }

    // Verification doublons sur la meme date dans le formulaire
    const dates = lignesValides.map((l) => dateToISO(l.date));
    const datesUniques = new Set(dates);
    if (datesUniques.size !== dates.length) {
      Alert.alert('Dates en double', 'Tu as plusieurs pesées à la même date. Garde une seule entrée par jour.');
      return;
    }

    setSaving(true);
    try {
      // On insert sequentiellement pour eviter les soucis de race sur le upsert
      for (const l of lignesValides) {
        const poids = Number(l.poids.replace(',', '.'));
        await addWeight({
          poids_kg: poids,
          date: dateToISO(l.date),
          source: 'manuel',
        });
      }
      Alert.alert(
        'Importation terminée',
        `${lignesValides.length} ${lignesValides.length > 1 ? 'pesées importées' : 'pesée importée'} dans ton historique.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Une partie de l\'import a échoué. Vérifie tes données et réessaie.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <IconButton icon="close" size={24} onPress={() => router.back()} />
        <Text variant="titleLarge" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Importer mes pesées
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card mode="contained" style={[styles.infoCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content>
            <Text variant="titleSmall" style={{ fontWeight: '600', color: theme.colors.onPrimaryContainer, marginBottom: 6 }}>
              💡 Import depuis une autre app
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, lineHeight: 18 }}>
              Saisis tes pesées passées pour visualiser ta progression complète. Ça n'affecte pas tes objectifs caloriques actuels.
            </Text>
          </Card.Content>
        </Card>

        {lignes.map((l, i) => (
          <Card key={l.id} mode="outlined" style={styles.ligneCard}>
            <Card.Content style={styles.ligneRow}>
              <Pressable
                onPress={() => togglePicker(l.id, true)}
                style={[styles.dateBtn, { borderColor: theme.colors.outlineVariant }]}
              >
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Date</Text>
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{formatDateFR(l.date)}</Text>
              </Pressable>

              <TextInput
                label="Poids (kg)"
                value={l.poids}
                onChangeText={(v) => setLignePoids(l.id, v)}
                mode="outlined"
                keyboardType="decimal-pad"
                returnKeyType="done"
                dense
                style={styles.poidsInput}
              />

              <IconButton
                icon="trash-can-outline"
                size={20}
                onPress={() => supprimerLigne(l.id)}
                disabled={lignes.length === 1}
              />
            </Card.Content>

            {l.showPicker && (
              <DateTimePicker
                value={l.date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event: DateTimePickerEvent, selected?: Date) => {
                  if (Platform.OS === 'android') togglePicker(l.id, false);
                  if (event.type === 'set' && selected) setLigneDate(l.id, selected);
                }}
                maximumDate={new Date()}
                locale="fr-FR"
              />
            )}
            {Platform.OS === 'ios' && l.showPicker && (
              <Button mode="text" onPress={() => togglePicker(l.id, false)} style={{ alignSelf: 'flex-end' }}>
                Valider
              </Button>
            )}
          </Card>
        ))}

        <Button
          mode="outlined"
          icon="plus"
          onPress={ajouterLigne}
          style={styles.addBtn}
        >
          Ajouter une pesée
        </Button>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleImport}
          loading={saving}
          disabled={saving || lignesValides.length === 0}
          style={styles.importBtn}
          contentStyle={{ paddingVertical: 8 }}
        >
          {lignesValides.length > 0
            ? `Importer ${lignesValides.length} ${lignesValides.length > 1 ? 'pesées' : 'pesée'}`
            : 'Importer'}
        </Button>
      </View>
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
  infoCard: { borderRadius: 14, marginBottom: 16 },
  ligneCard: { borderRadius: 14, marginBottom: 10 },
  ligneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateBtn: {
    flex: 1.2,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  poidsInput: { flex: 1 },
  addBtn: { borderRadius: 12, marginTop: 8 },
  footer: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 },
  importBtn: { borderRadius: 12 },
});
