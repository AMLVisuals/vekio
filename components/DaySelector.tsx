import { useState } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Text, IconButton, Button, Portal, Modal, useTheme } from 'react-native-paper';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useJournalStore, todayString, addDaysISO } from '../stores/journalStore';
import { colors, spacing, radius, palette } from '../theme/tokens';
import { haptic } from '../lib/haptics';

// Libelle francais d'une date "YYYY-MM-DD" relatif a aujourd'hui.
//   aujourd'hui -> « Aujourd'hui »
//   hier        -> « Hier »
//   sinon       -> « Lundi 1 juin »
function dayLabel(dateStr: string): string {
  const today = todayString();
  if (dateStr === today) return "Aujourd'hui";
  if (dateStr === addDaysISO(today, -1)) return 'Hier';
  // Midi local pour eviter tout glissement de fuseau a l'affichage.
  const d = new Date(dateStr + 'T12:00:00');
  const label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Date -> "YYYY-MM-DD" a partir des composantes locales (coherent avec l'affichage).
function dateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// En-tete de navigation par jour, façon MyFitnessPal :  ‹  Aujourd'hui  ▾  ›
// Les fleches font +/- 1 jour ; le label central ouvre un calendrier complet
// pour sauter directement a n'importe quelle date passee.
export default function DaySelector() {
  const theme = useTheme();
  const date = useJournalStore((s) => s.date);
  const shiftDay = useJournalStore((s) => s.shiftDay);
  const setDate = useJournalStore((s) => s.setDate);
  const isToday = useJournalStore((s) => s.isToday)();

  const [showPicker, setShowPicker] = useState(false);

  const handlePrev = () => { haptic.light(); shiftDay(-1); };
  const handleNext = () => { if (isToday) return; haptic.light(); shiftDay(1); };
  const openPicker = () => { haptic.light(); setShowPicker(true); };

  const applySelection = (selected?: Date) => {
    if (!selected) return;
    const iso = dateToISO(selected);
    if (iso !== date) setDate(iso);
  };

  // Android : calendrier natif en boite de dialogue (se ferme tout seul).
  const onAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShowPicker(false);
    if (event.type === 'set') applySelection(selected);
  };

  // iOS : calendrier en grille dans une modale (on applique en direct).
  const onIosChange = (_event: DateTimePickerEvent, selected?: Date) => {
    applySelection(selected);
  };

  return (
    <View style={styles.container}>
      <IconButton
        icon="chevron-left"
        size={26}
        iconColor={colors.text}
        onPress={handlePrev}
        style={styles.arrow}
      />

      <Pressable onPress={openPicker} style={styles.labelBtn} hitSlop={8}>
        <Text variant="titleMedium" style={styles.label}>{dayLabel(date)}</Text>
        <Text variant="bodySmall" style={styles.caret}>▾</Text>
      </Pressable>

      <IconButton
        icon="chevron-right"
        size={26}
        iconColor={isToday ? palette.neutral300 : colors.text}
        onPress={handleNext}
        disabled={isToday}
        style={styles.arrow}
      />

      {/* Android : dialogue natif */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={new Date(date + 'T12:00:00')}
          mode="date"
          display="calendar"
          onChange={onAndroidChange}
          maximumDate={new Date()}
        />
      )}

      {/* iOS : calendrier en grille dans une modale */}
      {Platform.OS === 'ios' && (
        <Portal>
          <Modal
            visible={showPicker}
            onDismiss={() => setShowPicker(false)}
            contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
          >
            <Text variant="titleMedium" style={styles.modalTitle}>Choisir un jour</Text>
            <DateTimePicker
              value={new Date(date + 'T12:00:00')}
              mode="date"
              display="inline"
              onChange={onIosChange}
              maximumDate={new Date()}
              locale="fr-FR"
              accentColor={palette.primary600}
            />
            <Button mode="contained" onPress={() => setShowPicker(false)} style={styles.modalBtn}>
              Valider
            </Button>
          </Modal>
        </Portal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  arrow: {
    margin: 0,
  },
  labelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    minWidth: 140,
    justifyContent: 'center',
  },
  label: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  caret: {
    color: colors.textMuted,
  },
  modal: {
    margin: spacing.xl,
    padding: spacing.xl,
    borderRadius: radius['2xl'],
  },
  modalTitle: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalBtn: {
    marginTop: spacing.md,
  },
});
