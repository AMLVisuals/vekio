import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Keyboard } from 'react-native';
import { Text, Portal, Modal, TextInput, Button, IconButton, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useJournalStore } from '../../stores/journalStore';
import { useUserStore } from '../../stores/userStore';
import { useHydratationStore } from '../../stores/hydratationStore';
import { colors, spacing, radius, palette } from '../../theme/tokens';
import { haptic } from '../../lib/haptics';
import { useIntroPopup } from '../../lib/useIntroPopup';
import DualGauge from '../../components/DualGauge';
import IntroModal from '../../components/IntroModal';

const PRESETS_ML = [150, 250, 500] as const;

function getProgressColor(ratio: number): string {
  if (ratio < 0.9) return colors.success;
  if (ratio <= 1.1) return colors.warning;
  return colors.error;
}

export default function DashboardScreen() {
  const theme = useTheme();
  const { entries, loadFromSupabase } = useJournalStore();
  const profile = useUserStore((s) => s.profile);
  const macros = useUserStore((s) => s.macros);
  const { totalMl, objectifMl, loadToday, addWater, removeWater } = useHydratationStore();

  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const intro = useIntroPopup('dashboard');

  useEffect(() => {
    loadFromSupabase();
    loadToday();
  }, []);

  const totalCal = entries.reduce((sum, e) => sum + e.calories, 0);
  const totalProt = entries.reduce((sum, e) => sum + e.proteines, 0);
  const totalGluc = entries.reduce((sum, e) => sum + e.glucides, 0);
  const totalLip = entries.reduce((sum, e) => sum + e.lipides, 0);

  const calTarget = macros?.calories ?? 2000;
  const calRatio = totalCal / calTarget;
  const hydroPct = Math.min(100, Math.round((totalMl / objectifMl) * 100));

  const handleAddPreset = (ml: number) => {
    haptic.light();
    addWater(ml);
  };

  const handleAddCustom = () => {
    haptic.light();
    setCustomValue('');
    setShowCustom(true);
  };

  const validateCustom = () => {
    const ml = Number(customValue.replace(',', '.'));
    if (isNaN(ml) || ml <= 0 || ml > 5000) return;
    Keyboard.dismiss();
    haptic.success();
    addWater(Math.round(ml));
    setShowCustom(false);
  };

  const handleRemoveLast = () => {
    if (totalMl > 0) {
      haptic.light();
      // Retire le dernier preset le plus probable : 250ml par defaut
      removeWater(Math.min(250, totalMl));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text variant="headlineLarge" style={styles.greeting}>
              {profile?.nom ? `Salut ${profile.nom}` : 'Vekio'}
            </Text>
            <Text variant="bodyMedium" style={styles.date}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <IconButton
            icon="information-outline"
            size={22}
            iconColor={colors.textMuted}
            onPress={intro.open}
            style={{ margin: 0 }}
          />
        </View>

        {/* Double anneau calories + hydratation */}
        <View style={styles.gaugeContainer}>
          <DualGauge
            caloriesCurrent={Math.round(totalCal)}
            caloriesTarget={calTarget}
            caloriesColor={getProgressColor(calRatio)}
            waterCurrent={totalMl}
            waterTarget={objectifMl}
          />
        </View>

        {/* Ligne hydratation chiffree */}
        <View style={styles.hydroLine}>
          <Text variant="bodyMedium" style={styles.hydroText}>
            💧 <Text style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}>{totalMl}</Text>
            <Text style={{ color: colors.textMuted }}> / {objectifMl} ml · {hydroPct}%</Text>
          </Text>
        </View>

        {/* Boutons presets hydratation */}
        <View style={styles.presetsRow}>
          {PRESETS_ML.map((ml) => (
            <Pressable
              key={ml}
              onPress={() => handleAddPreset(ml)}
              style={[styles.presetBtn, { borderColor: palette.neutral300 }]}
            >
              <Text variant="bodyMedium" style={styles.presetTextValue}>+{ml}</Text>
              <Text variant="bodySmall" style={styles.presetTextUnit}>ml</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={handleAddCustom}
            style={[styles.presetBtn, styles.presetBtnAccent]}
          >
            <Text variant="bodyMedium" style={[styles.presetTextValue, { color: '#FFF' }]}>+</Text>
            <Text variant="bodySmall" style={[styles.presetTextUnit, { color: 'rgba(255,255,255,0.85)' }]}>autre</Text>
          </Pressable>
        </View>

        {/* Bouton retirer (en cas d'erreur) */}
        {totalMl > 0 && (
          <Pressable onPress={handleRemoveLast} style={styles.undoLink} hitSlop={8}>
            <Text variant="bodySmall" style={{ color: colors.textMuted, textDecorationLine: 'underline' }}>
              Retirer la dernière entrée
            </Text>
          </Pressable>
        )}

        {/* Macros */}
        <View style={{ marginTop: spacing['3xl'] }}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Macros du jour</Text>
          <View style={styles.macrosContainer}>
            <MacroBar
              label="Protéines"
              current={Math.round(totalProt)}
              target={macros?.proteines_g ?? 0}
              color={colors.macroProteine}
            />
            <MacroBar
              label="Glucides"
              current={Math.round(totalGluc)}
              target={macros?.glucides_g ?? 0}
              color={colors.macroGlucide}
            />
            <MacroBar
              label="Lipides"
              current={Math.round(totalLip)}
              target={macros?.lipides_g ?? 0}
              color={colors.macroLipide}
            />
          </View>
        </View>
      </ScrollView>

      {/* Modal saisie quantite custom */}
      <Portal>
        <Modal
          visible={showCustom}
          onDismiss={() => setShowCustom(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Quantité d'eau</Text>
          <Text variant="bodySmall" style={styles.modalDesc}>
            Combien de millilitres veux-tu ajouter ?
          </Text>
          <TextInput
            value={customValue}
            onChangeText={setCustomValue}
            mode="outlined"
            keyboardType="numeric"
            placeholder="Ex. 330"
            autoFocus
            right={<TextInput.Affix text="ml" />}
            returnKeyType="done"
            onSubmitEditing={validateCustom}
            style={{ marginBottom: spacing.lg }}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button mode="text" onPress={() => setShowCustom(false)} style={{ flex: 1 }}>
              Annuler
            </Button>
            <Button
              mode="contained"
              onPress={validateCustom}
              disabled={!customValue || isNaN(Number(customValue.replace(',', '.')))}
              style={{ flex: 1 }}
            >
              Ajouter
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Pop-up intro Dashboard */}
      <IntroModal
        visible={intro.visible}
        emoji="🌿"
        title="Bienvenue sur ton tableau de bord"
        description="Tout ce qui compte au quotidien, sur un seul écran."
        sections={[
          { icon: '🟢', title: 'Anneau extérieur', body: "Tes calories du jour. Vert si tu es en dessous de l'objectif, orange dans la marge, rouge si dépassé." },
          { icon: '💧', title: 'Anneau intérieur', body: "Ton hydratation. Tape les boutons sous l'anneau pour ajouter rapidement de l'eau, ou « + autre » pour une quantité custom." },
          { icon: '📊', title: 'Macros', body: "Sous l'anneau, ton apport en protéines, glucides et lipides en barres colorées." },
        ]}
        onValidate={intro.close}
        dismissable
        onDismiss={intro.close}
      />
    </SafeAreaView>
  );
}

function MacroBar({ label, current, target, color }: {
  label: string; current: number; target: number; color: string;
}) {
  const ratio = target > 0 ? current / target : 0;
  const progressWidth = `${Math.min(ratio * 100, 100)}%`;

  return (
    <View style={styles.macroBarContainer}>
      <View style={styles.macroBarHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <Text variant="bodyMedium" style={{ color: colors.text }}>{label}</Text>
        </View>
        <Text variant="labelLarge" style={{ color: colors.text }}>
          {current}<Text style={{ color: colors.textMuted }}> / {target} g</Text>
        </Text>
      </View>
      <View style={styles.macroBarBg}>
        <View style={[styles.macroBarFill, { width: progressWidth as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  greeting: { color: colors.text, fontFamily: 'Inter_700Bold' },
  date: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    textTransform: 'capitalize',
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  hydroLine: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  hydroText: {
    color: colors.text,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presetBtn: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  presetBtnAccent: {
    borderColor: colors.water,
    backgroundColor: colors.water,
  },
  presetTextValue: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  presetTextUnit: {
    color: colors.textMuted,
    marginTop: 1,
  },
  undoLink: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    marginBottom: spacing.md,
  },
  macrosContainer: {
    gap: spacing.lg,
  },
  macroBarContainer: {
    gap: spacing.sm,
  },
  macroBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroBarBg: {
    height: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceVariant,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: radius.sm,
  },
  modal: {
    margin: spacing.xl,
    padding: spacing['2xl'],
    borderRadius: radius['2xl'],
  },
  modalTitle: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
    marginBottom: spacing.xs,
  },
  modalDesc: {
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
});
