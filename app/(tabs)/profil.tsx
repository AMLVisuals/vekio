import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Keyboard, Pressable, Platform } from 'react-native';
import { Text, Card, Button, TextInput, IconButton, Switch, useTheme } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useUserStore } from '../../stores/userStore';
import { useWeightStore } from '../../stores/weightStore';
import { supabase } from '../../lib/supabase';
import { describePhase, type Intention, type Sport, type SportType, type Frequence, type Profile, type Vitesse } from '../../lib/nutrition';
import { colors, spacing, radius, shadow } from '../../theme/tokens';
import { useIntroPopup } from '../../lib/useIntroPopup';
import IntroModal from '../../components/IntroModal';

const OBJECTIFS = [
  { value: 'perte', label: 'Perdre du poids' },
  { value: 'maintien', label: 'Maintenir' },
  { value: 'prise', label: 'Prendre du poids' },
];

const INTENTION_LABELS: Record<string, string> = {
  bien_etre: '🌱 Me sentir mieux',
  silhouette: '✨ Affiner ma silhouette',
  tonique: '💪 Devenir plus tonique',
};

const INTENTIONS: { value: Intention; label: string }[] = [
  { value: 'bien_etre',  label: '🌱 Me sentir mieux' },
  { value: 'silhouette', label: '✨ Affiner ma silhouette' },
  { value: 'tonique',    label: '💪 Devenir plus tonique' },
];

const SPORT_OPTIONS: { type: SportType; label: string; emoji: string }[] = [
  { type: 'musculation', label: 'Musculation', emoji: '🏋️' },
  { type: 'cardio',      label: 'Cardio',      emoji: '🏃' },
  { type: 'collectif',   label: 'Sport collectif', emoji: '⚽' },
  { type: 'martial',     label: 'Boxe / Arts martiaux', emoji: '🥋' },
  { type: 'yoga',        label: 'Yoga / Pilates', emoji: '🧘' },
  { type: 'autre',       label: 'Autre',       emoji: '🏅' },
  { type: 'aucun',       label: 'Aucun',       emoji: '😴' },
];

const FREQUENCES: Frequence[] = [1, 2, 3, 4, 5, 6, 7];

export default function ProfilScreen() {
  const theme = useTheme();
  const profile = useUserStore((s) => s.profile);
  const macros = useUserStore((s) => s.macros);
  const macrosMode = useUserStore((s) => s.macrosMode);
  const saveProfile = useUserStore((s) => s.saveProfile);
  const saveMacrosManual = useUserStore((s) => s.saveMacrosManual);
  const resetMacrosToAuto = useUserStore((s) => s.resetMacrosToAuto);
  const logout = useUserStore((s) => s.logout);

  const [editingProfile, setEditingProfile] = useState(false);
  const [editingMacros, setEditingMacros] = useState(false);
  const [editingObjectif, setEditingObjectif] = useState(false);
  const [editingActivites, setEditingActivites] = useState(false);
  const [editingCycle, setEditingCycle] = useState(false);

  // Etats cycle menstruel (uniquement si sexe = femme)
  const [cycleActifEdit, setCycleActifEdit] = useState(profile?.cycle_actif ?? false);
  const [cycleDateEdit, setCycleDateEdit] = useState<Date>(
    profile?.cycle_dernieres_regles ? new Date(profile.cycle_dernieres_regles) : new Date()
  );
  const [cycleDureeEdit, setCycleDureeEdit] = useState(String(profile?.cycle_duree_jours ?? 28));
  const [showCycleDatePicker, setShowCycleDatePicker] = useState(false);
  const [editSports, setEditSports] = useState<Sport[]>(profile?.sports ?? []);
  const [saving, setSaving] = useState(false);
  const intro = useIntroPopup('profil');

  const toggleEditSport = (type: SportType) => {
    setEditSports((prev) => {
      if (type === 'aucun') {
        return prev.find((s) => s.type === 'aucun') ? [] : [{ type: 'aucun', frequence: 1 }];
      }
      const without = prev.filter((s) => s.type !== 'aucun');
      const exists = without.find((s) => s.type === type);
      if (exists) return without.filter((s) => s.type !== type);
      return [...without, { type, frequence: 3 }];
    });
  };

  const setEditSportFreq = (type: SportType, frequence: Frequence) => {
    setEditSports((prev) => prev.map((s) => s.type === type ? { ...s, frequence } : s));
  };

  const handleSaveActivites = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await saveProfile({
        nom: profile.nom,
        age: profile.age,
        poids: profile.poids,
        taille: profile.taille,
        sexe: profile.sexe,
        objectif: profile.objectif,
        vitesse_kg_semaine: profile.vitesse_kg_semaine ?? null,
        date_naissance: profile.date_naissance ?? null,
        sports: editSports,
        masse_grasse_pct: profile.masse_grasse_pct,
        masse_musculaire_pct: profile.masse_musculaire_pct,
        masse_hydrique_pct: profile.masse_hydrique_pct,
        poids_objectif: profile.poids_objectif ?? null,
        intention: profile.intention ?? null,
        cycle_actif: profile.cycle_actif,
        cycle_dernieres_regles: profile.cycle_dernieres_regles,
        cycle_duree_jours: profile.cycle_duree_jours,
      });
      setEditingActivites(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    }
    setSaving(false);
  };

  // Champs profil
  const [nom, setNom] = useState(profile?.nom ?? '');
  const [age, setAge] = useState(String(profile?.age ?? ''));
  const [poids, setPoids] = useState(String(profile?.poids ?? ''));
  const [taille, setTaille] = useState(String(profile?.taille ?? ''));
  const [sexe, setSexe] = useState(profile?.sexe ?? 'homme');
  const [objectif, setObjectif] = useState(profile?.objectif ?? 'maintien');

  // Champs objectif (cible + intention)
  const [poidsCible, setPoidsCible] = useState(profile?.poids_objectif !== null && profile?.poids_objectif !== undefined ? String(profile.poids_objectif) : '');
  const [sansCible, setSansCible] = useState(profile?.poids_objectif === null);
  const [intention, setIntention] = useState<Intention | null>(profile?.intention ?? null);

  // Champs macros custom. Calories calculees en live a partir des 3 macros
  // (4 kcal/g prot, 4 kcal/g gluc, 9 kcal/g lip). Pas de champ Calories edite.
  const [customProt, setCustomProt] = useState(String(macros?.proteines_g ?? ''));
  const [customGluc, setCustomGluc] = useState(String(macros?.glucides_g ?? ''));
  const [customLip, setCustomLip] = useState(String(macros?.lipides_g ?? ''));
  const customCalLive =
    (Number(customProt) || 0) * 4 +
    (Number(customGluc) || 0) * 4 +
    (Number(customLip) || 0) * 9;

  const handleSaveProfile = async () => {
    if (!nom || !age || !poids || !taille) {
      Alert.alert('Erreur', 'Remplis tous les champs');
      return;
    }

    setSaving(true);
    try {
      await saveProfile({
        nom,
        age: Number(age),
        poids: Number(poids),
        taille: Number(taille),
        sexe: sexe as any,
        objectif: objectif as any,
        vitesse_kg_semaine: profile?.vitesse_kg_semaine ?? null,
        date_naissance: profile?.date_naissance ?? null,
        sports: profile?.sports ?? [],
        masse_grasse_pct: profile?.masse_grasse_pct,
        masse_musculaire_pct: profile?.masse_musculaire_pct,
        masse_hydrique_pct: profile?.masse_hydrique_pct,
        poids_objectif: profile?.poids_objectif ?? null,
        intention: profile?.intention ?? null,
        cycle_actif: profile?.cycle_actif,
        cycle_dernieres_regles: profile?.cycle_dernieres_regles,
        cycle_duree_jours: profile?.cycle_duree_jours,
      });

      // Mettre a jour le poids dans l'historique si change
      if (Number(poids) !== profile?.poids) {
        await useWeightStore.getState().addWeight({ poids_kg: Number(poids), source: 'manuel' });
      }

      // Mettre a jour les champs macros avec les nouvelles valeurs calculees
      const newMacros = useUserStore.getState().macros;
      if (newMacros) {
        setCustomProt(String(newMacros.proteines_g));
        setCustomGluc(String(newMacros.glucides_g));
        setCustomLip(String(newMacros.lipides_g));
      }

      setEditingProfile(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    }
    setSaving(false);
  };

  const handleResetMacros = () => {
    if (!profile) return;
    Alert.alert(
      'Recalculer selon mon profil',
      'Tes objectifs vont être remis aux valeurs calculées par l\'app à partir de ton poids, taille, âge, sexe, sports et objectif. Tes modifications manuelles seront perdues et le mode automatique sera réactivé.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Recalculer',
          onPress: async () => {
            setSaving(true);
            try {
              const m = await resetMacrosToAuto();
              setCustomProt(String(m.proteines_g));
              setCustomGluc(String(m.glucides_g));
              setCustomLip(String(m.lipides_g));
              setEditingMacros(false);
            } catch {
              Alert.alert('Erreur', 'Impossible de recalculer');
            }
            setSaving(false);
          },
        },
      ],
    );
  };

  const handleSaveMacros = async () => {
    const prot = Number(customProt);
    const gluc = Number(customGluc);
    const lip = Number(customLip);
    const cal = Math.round(prot * 4 + gluc * 4 + lip * 9);

    if (!prot || !gluc || !lip) {
      Alert.alert('Erreur', 'Remplis les trois macros');
      return;
    }

    setSaving(true);
    try {
      await saveMacrosManual({ calories: cal, proteines_g: prot, glucides_g: gluc, lipides_g: lip });
      setEditingMacros(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    }
    setSaving(false);
  };

  const handleSaveObjectif = async () => {
    if (!profile) return;

    const cibleNum = sansCible ? null : Number(poidsCible.replace(',', '.'));
    if (!sansCible) {
      if (!cibleNum || isNaN(cibleNum) || cibleNum < 30 || cibleNum > 250) {
        Alert.alert('Erreur', 'Renseigne un poids cible entre 30 et 250 kg, ou choisis "Pas de cible précise".');
        return;
      }
      if (profile.objectif === 'perte' && cibleNum >= profile.poids) {
        Alert.alert('Erreur', 'En perte, la cible doit être inférieure à ton poids actuel.');
        return;
      }
      if (profile.objectif === 'prise' && cibleNum <= profile.poids) {
        Alert.alert('Erreur', 'En prise, la cible doit être supérieure à ton poids actuel.');
        return;
      }
    }

    setSaving(true);
    try {
      await saveProfile({
        nom: profile.nom,
        age: profile.age,
        poids: profile.poids,
        taille: profile.taille,
        sexe: profile.sexe,
        objectif: profile.objectif,
        vitesse_kg_semaine: profile.vitesse_kg_semaine ?? null,
        date_naissance: profile.date_naissance ?? null,
        sports: profile.sports,
        masse_grasse_pct: profile.masse_grasse_pct,
        masse_musculaire_pct: profile.masse_musculaire_pct,
        masse_hydrique_pct: profile.masse_hydrique_pct,
        poids_objectif: sansCible ? null : cibleNum,
        intention,
        cycle_actif: profile.cycle_actif,
        cycle_dernieres_regles: profile.cycle_dernieres_regles,
        cycle_duree_jours: profile.cycle_duree_jours,
      });
      setEditingObjectif(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    }
    setSaving(false);
  };

  const handleSaveCycle = async () => {
    if (!profile) return;
    const duree = Math.round(Number(cycleDureeEdit));
    if (cycleActifEdit && (isNaN(duree) || duree < 21 || duree > 40)) {
      Alert.alert('Erreur', 'La durée du cycle doit être entre 21 et 40 jours.');
      return;
    }
    setSaving(true);
    try {
      await saveProfile({
        nom: profile.nom,
        age: profile.age,
        poids: profile.poids,
        taille: profile.taille,
        sexe: profile.sexe,
        objectif: profile.objectif,
        vitesse_kg_semaine: profile.vitesse_kg_semaine ?? null,
        date_naissance: profile.date_naissance ?? null,
        sports: profile.sports,
        masse_grasse_pct: profile.masse_grasse_pct,
        masse_musculaire_pct: profile.masse_musculaire_pct,
        masse_hydrique_pct: profile.masse_hydrique_pct,
        poids_objectif: profile.poids_objectif ?? null,
        intention: profile.intention ?? null,
        cycle_actif: cycleActifEdit,
        cycle_dernieres_regles: cycleActifEdit ? cycleDateEdit.toISOString().split('T')[0] : null,
        cycle_duree_jours: cycleActifEdit ? duree : 28,
      });
      setEditingCycle(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    }
    setSaving(false);
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Tu veux te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est définitive. Toutes tes données (profil, repas, menus, pesées, hydratation) seront supprimées de manière irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer définitivement',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Erreur', 'Session expirée. Reconnecte-toi puis réessaie.');
        return;
      }

      const SUPABASE_URL = 'https://mwbrwppbwucbeardeyyc.supabase.co';
      const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const text = await res.text();
        Alert.alert('Erreur', `La suppression a échoué : ${text}. Réessaie ou contacte-nous.`);
        return;
      }

      // Success — logout local et redirection
      await logout();
      router.replace('/(auth)/login');
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de joindre le serveur. Vérifie ta connexion.');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
          <View style={styles.titleRow}>
            <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.onBackground }]}>
              Profil
            </Text>
            <IconButton
              icon="information-outline"
              size={22}
              iconColor={colors.textMuted}
              onPress={intro.open}
              style={{ margin: 0 }}
            />
          </View>

          {/* Infos profil */}
          <Card style={styles.card} mode="contained">
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text variant="titleMedium" style={styles.cardTitle}>Mes informations</Text>
                {!editingProfile && (
                  <Button compact mode="text" onPress={() => setEditingProfile(true)}>
                    Modifier
                  </Button>
                )}
              </View>

              {editingProfile ? (
                <>
                  <TextInput label="Prénom" value={nom} onChangeText={setNom} mode="outlined" dense style={styles.input} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />

                  <View style={styles.chipRow}>
                    {[{ v: 'homme', l: 'Homme' }, { v: 'femme', l: 'Femme' }].map((s) => (
                      <Button key={s.v} mode={sexe === s.v ? 'contained' : 'outlined'} compact onPress={() => setSexe(s.v as any)} style={styles.chip}>
                        {s.l}
                      </Button>
                    ))}
                  </View>

                  <TextInput label="Âge" value={age} onChangeText={setAge} mode="outlined" dense keyboardType="numeric" right={<TextInput.Affix text="ans" />} style={styles.input} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />

                  <View style={styles.row}>
                    <TextInput label="Poids" value={poids} onChangeText={setPoids} mode="outlined" dense keyboardType="decimal-pad" right={<TextInput.Affix text="kg" />} style={[styles.input, { flex: 1 }]} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                    <View style={{ width: 8 }} />
                    <TextInput label="Taille" value={taille} onChangeText={setTaille} mode="outlined" dense keyboardType="numeric" right={<TextInput.Affix text="cm" />} style={[styles.input, { flex: 1 }]} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                  </View>

                  <Text variant="bodySmall" style={styles.label}>Objectif</Text>
                  <View style={styles.chipRow}>
                    {OBJECTIFS.map((o) => (
                      <Button key={o.value} mode={objectif === o.value ? 'contained' : 'outlined'} compact onPress={() => setObjectif(o.value as any)} style={styles.chip}>
                        {o.label}
                      </Button>
                    ))}
                  </View>

                  <View style={styles.editButtons}>
                    <Button mode="text" onPress={() => setEditingProfile(false)} style={{ flex: 1 }}>Annuler</Button>
                    <Button mode="contained" onPress={handleSaveProfile} loading={saving} style={{ flex: 1 }}>Sauvegarder</Button>
                  </View>
                </>
              ) : (
                <>
                  <InfoRow label="Prénom" value={profile?.nom ?? '-'} />
                  <InfoRow label="Sexe" value={profile?.sexe === 'homme' ? 'Homme' : 'Femme'} />
                  <InfoRow label="Âge" value={`${profile?.age ?? '-'} ans`} />
                  <InfoRow label="Poids" value={`${profile?.poids ?? '-'} kg`} />
                  <InfoRow label="Taille" value={`${profile?.taille ?? '-'} cm`} />
                  <InfoRow label="Objectif" value={OBJECTIFS.find((o) => o.value === profile?.objectif)?.label ?? '-'} />
                </>
              )}
            </Card.Content>
          </Card>

          {/* Mon objectif (cible + intention) — masque si maintien sans intention */}
          {(profile?.objectif === 'perte' || profile?.objectif === 'prise' || profile?.intention) && (
            <Card style={styles.card} mode="contained">
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text variant="titleMedium" style={styles.cardTitle}>Mon objectif</Text>
                  {!editingObjectif && (
                    <Button compact mode="text" onPress={() => setEditingObjectif(true)}>
                      Modifier
                    </Button>
                  )}
                </View>

                {editingObjectif ? (
                  <>
                    {(profile?.objectif === 'perte' || profile?.objectif === 'prise') && (
                      <>
                        {!sansCible ? (
                          <>
                            <TextInput
                              label="Poids cible (kg)"
                              value={poidsCible}
                              onChangeText={setPoidsCible}
                              mode="outlined"
                              dense
                              keyboardType="decimal-pad"
                              right={<TextInput.Affix text="kg" />}
                              style={styles.input}
                              returnKeyType="done"
                              onSubmitEditing={Keyboard.dismiss}
                            />
                            <Pressable onPress={() => { setSansCible(true); setPoidsCible(''); }}>
                              <Text variant="bodySmall" style={[styles.skipLink, { color: theme.colors.primary }]}>
                                Pas de cible précise
                              </Text>
                            </Pressable>
                          </>
                        ) : (
                          <Pressable
                            style={[styles.sansCibleBox, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceVariant }]}
                            onPress={() => setSansCible(false)}
                          >
                            <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Pas de cible précise</Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                              Touche pour en définir une
                            </Text>
                          </Pressable>
                        )}
                      </>
                    )}

                    <Text variant="bodySmall" style={[styles.label, { marginTop: 12 }]}>Mon intention</Text>
                    <View style={{ gap: 8 }}>
                      {INTENTIONS.map((i) => (
                        <Button
                          key={i.value}
                          mode={intention === i.value ? 'contained' : 'outlined'}
                          onPress={() => setIntention(i.value)}
                          style={{ borderRadius: 10 }}
                          contentStyle={{ justifyContent: 'flex-start' }}
                        >
                          {i.label}
                        </Button>
                      ))}
                    </View>

                    <View style={styles.editButtons}>
                      <Button mode="text" onPress={() => {
                        setEditingObjectif(false);
                        setPoidsCible(profile?.poids_objectif !== null && profile?.poids_objectif !== undefined ? String(profile.poids_objectif) : '');
                        setSansCible(profile?.poids_objectif === null);
                        setIntention(profile?.intention ?? null);
                      }} style={{ flex: 1 }}>
                        Annuler
                      </Button>
                      <Button mode="contained" onPress={handleSaveObjectif} loading={saving} style={{ flex: 1 }}>
                        Sauvegarder
                      </Button>
                    </View>
                  </>
                ) : (
                  <>
                    {(profile?.objectif === 'perte' || profile?.objectif === 'prise') && (
                      <InfoRow
                        label="Poids cible"
                        value={profile?.poids_objectif !== null && profile?.poids_objectif !== undefined
                          ? `${profile.poids_objectif} kg`
                          : 'Pas de cible précise'}
                      />
                    )}
                    <InfoRow
                      label="Intention"
                      value={profile?.intention ? INTENTION_LABELS[profile.intention] : '-'}
                    />
                    {profile?.objectif_atteint_le && (
                      <Text variant="bodySmall" style={{ color: '#4CAF50', marginTop: 8, textAlign: 'center' }}>
                        🎯 Objectif atteint le {new Date(profile.objectif_atteint_le).toLocaleDateString('fr-FR')}
                      </Text>
                    )}
                  </>
                )}
              </Card.Content>
            </Card>
          )}

          {/* Mon cycle (uniquement si sexe = femme) */}
          {profile?.sexe === 'femme' && (
            <Card style={styles.card} mode="contained">
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text variant="titleMedium" style={styles.cardTitle}>Mon cycle</Text>
                  {!editingCycle && (
                    <Button compact mode="text" onPress={() => {
                      setCycleActifEdit(profile.cycle_actif);
                      setCycleDateEdit(profile.cycle_dernieres_regles ? new Date(profile.cycle_dernieres_regles) : new Date());
                      setCycleDureeEdit(String(profile.cycle_duree_jours));
                      setEditingCycle(true);
                    }}>
                      Modifier
                    </Button>
                  )}
                </View>

                {editingCycle ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, flex: 1 }}>
                        Suivre mon cycle
                      </Text>
                      <Switch value={cycleActifEdit} onValueChange={setCycleActifEdit} />
                    </View>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic', marginBottom: 12 }}>
                      En phase lutéale ton métabolisme augmente. On ajoute +150 kcal/j à tes besoins ces jours-là.
                    </Text>

                    {cycleActifEdit && (
                      <>
                        <Text variant="bodySmall" style={[styles.label, { marginTop: 8 }]}>
                          Date du 1er jour des dernières règles
                        </Text>
                        <Pressable
                          onPress={() => setShowCycleDatePicker(true)}
                          style={[styles.dateBtn, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}
                        >
                          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                            {cycleDateEdit.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </Text>
                        </Pressable>
                        {showCycleDatePicker && (
                          <DateTimePicker
                            value={cycleDateEdit}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            maximumDate={new Date()}
                            minimumDate={new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)}
                            onChange={(e: DateTimePickerEvent, d?: Date) => {
                              if (Platform.OS === 'android') setShowCycleDatePicker(false);
                              if (e.type === 'set' && d) setCycleDateEdit(d);
                            }}
                            locale="fr-FR"
                          />
                        )}
                        {Platform.OS === 'ios' && showCycleDatePicker && (
                          <Button mode="text" onPress={() => setShowCycleDatePicker(false)} style={{ alignSelf: 'flex-end' }}>
                            Valider
                          </Button>
                        )}

                        <TextInput
                          label="Durée moyenne du cycle"
                          value={cycleDureeEdit}
                          onChangeText={setCycleDureeEdit}
                          mode="outlined"
                          dense
                          keyboardType="numeric"
                          right={<TextInput.Affix text="jours" />}
                          style={[styles.input, { marginTop: 12 }]}
                          returnKeyType="done"
                          onSubmitEditing={Keyboard.dismiss}
                        />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
                          Entre 21 et 40 jours. Si tu ne sais pas, garde 28 (moyenne).
                        </Text>
                      </>
                    )}

                    <View style={styles.editButtons}>
                      <Button mode="text" onPress={() => setEditingCycle(false)} style={{ flex: 1 }}>
                        Annuler
                      </Button>
                      <Button mode="contained" onPress={handleSaveCycle} loading={saving} style={{ flex: 1 }}>
                        Sauvegarder
                      </Button>
                    </View>
                  </>
                ) : (
                  <>
                    {profile.cycle_actif && profile.cycle_dernieres_regles ? (
                      <CycleInfo profile={profile} />
                    ) : (
                      <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
                        Suivi non activé. Active-le pour adapter tes besoins en phase lutéale.
                      </Text>
                    )}
                  </>
                )}
              </Card.Content>
            </Card>
          )}

          {/* Mes activités sportives */}
          <Card style={styles.card} mode="contained">
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text variant="titleMedium" style={styles.cardTitle}>Mes activités</Text>
                {!editingActivites && (
                  <Button compact mode="text" onPress={() => {
                    setEditSports(profile?.sports ?? []);
                    setEditingActivites(true);
                  }}>
                    Modifier
                  </Button>
                )}
              </View>

              {editingActivites ? (
                <>
                  <Text variant="bodySmall" style={{ color: colors.textMuted, marginBottom: spacing.md }}>
                    Sélectionne tes sports puis indique combien de jours par semaine.
                  </Text>

                  <View style={styles.sportTagsRow}>
                    {SPORT_OPTIONS.map((opt) => {
                      const isSel = editSports.find((s) => s.type === opt.type);
                      return (
                        <Pressable
                          key={opt.type}
                          onPress={() => toggleEditSport(opt.type)}
                          style={[
                            styles.sportTag,
                            {
                              borderColor: isSel ? theme.colors.primary : colors.border,
                              backgroundColor: isSel ? theme.colors.primaryContainer : 'transparent',
                            },
                          ]}
                        >
                          <Text style={{ fontSize: 16 }}>{opt.emoji}</Text>
                          <Text variant="bodySmall" style={{ color: isSel ? theme.colors.onPrimaryContainer : colors.text }}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {editSports.length > 0 && !editSports.find((s) => s.type === 'aucun') && (
                    <View style={{ marginTop: spacing.md }}>
                      {editSports.map((s) => {
                        const opt = SPORT_OPTIONS.find((o) => o.type === s.type);
                        if (!opt) return null;
                        return (
                          <View key={s.type} style={styles.freqEditBlock}>
                            <View style={styles.freqEditHeader}>
                              <Text style={{ fontSize: 16 }}>{opt.emoji}</Text>
                              <Text variant="bodyMedium" style={{ flex: 1, color: colors.text }}>{opt.label}</Text>
                              <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                                {s.frequence} jour{s.frequence > 1 ? 's' : ''} / sem
                              </Text>
                            </View>
                            <View style={styles.freqEditRow}>
                              {FREQUENCES.map((f) => {
                                const isSel = s.frequence === f;
                                return (
                                  <Pressable
                                    key={f}
                                    onPress={() => setEditSportFreq(s.type, f)}
                                    style={[
                                      styles.freqEditOption,
                                      {
                                        borderColor: isSel ? theme.colors.primary : colors.border,
                                        backgroundColor: isSel ? theme.colors.primary : 'transparent',
                                      },
                                    ]}
                                  >
                                    <Text variant="bodySmall" style={{
                                      color: isSel ? '#FFF' : colors.textMuted,
                                      fontWeight: '600',
                                    }}>
                                      {f}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  <View style={styles.editButtons}>
                    <Button mode="text" onPress={() => {
                      setEditingActivites(false);
                      setEditSports(profile?.sports ?? []);
                    }} style={{ flex: 1 }}>
                      Annuler
                    </Button>
                    <Button mode="contained" onPress={handleSaveActivites} loading={saving} style={{ flex: 1 }}>
                      Sauvegarder
                    </Button>
                  </View>
                </>
              ) : (
                <>
                  {profile?.sports && profile.sports.length > 0 && !profile.sports.find((s) => s.type === 'aucun') ? (
                    profile.sports.map((s) => {
                      const opt = SPORT_OPTIONS.find((o) => o.type === s.type);
                      return (
                        <View key={s.type} style={styles.infoRow}>
                          <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
                            {opt?.emoji} {opt?.label ?? s.type}
                          </Text>
                          <Text variant="bodyMedium" style={{ fontWeight: '600', color: colors.text }}>
                            {s.frequence} jour{s.frequence > 1 ? 's' : ''} / sem
                          </Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
                      Aucun sport régulier
                    </Text>
                  )}
                </>
              )}
            </Card.Content>
          </Card>

          {/* Objectifs macros */}
          <Card style={styles.card} mode="contained">
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                  <Text variant="titleMedium" style={styles.cardTitle}>Objectifs journaliers</Text>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                    backgroundColor: macrosMode === 'auto' ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                  }}>
                    <Text variant="labelSmall" style={{
                      color: macrosMode === 'auto' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
                      fontWeight: '600',
                    }}>
                      {macrosMode === 'auto' ? 'Auto' : 'Manuel'}
                    </Text>
                  </View>
                </View>
                {!editingMacros && (
                  <Button compact mode="text" onPress={() => setEditingMacros(true)}>
                    Modifier
                  </Button>
                )}
              </View>
              {!editingMacros && (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic', marginBottom: 8 }}>
                  {macrosMode === 'auto'
                    ? 'Recalculés automatiquement après chaque pesée selon ton profil.'
                    : 'Valeurs personnalisées — figées jusqu\'à un nouveau recalcul.'}
                </Text>
              )}

              {editingMacros ? (
                <>
                  <TextInput label="Protéines" value={customProt} onChangeText={setCustomProt} mode="outlined" dense keyboardType="numeric" right={<TextInput.Affix text="g" />} style={styles.input} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                  <TextInput label="Glucides" value={customGluc} onChangeText={setCustomGluc} mode="outlined" dense keyboardType="numeric" right={<TextInput.Affix text="g" />} style={styles.input} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                  <TextInput label="Lipides" value={customLip} onChangeText={setCustomLip} mode="outlined" dense keyboardType="numeric" right={<TextInput.Affix text="g" />} style={styles.input} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 8, marginBottom: 4 }}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                      Calories totales
                    </Text>
                    <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                      {customCalLive} kcal
                    </Text>
                  </View>

                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic', marginBottom: 8 }}>
                    Calories = protéines × 4 + glucides × 4 + lipides × 9. Modifie les macros pour personnaliser tes objectifs.
                  </Text>

                  <Button
                    mode="outlined"
                    icon="refresh"
                    onPress={handleResetMacros}
                    style={{ marginBottom: 8 }}
                  >
                    Recalculer selon mon profil
                  </Button>

                  <View style={styles.editButtons}>
                    <Button mode="text" onPress={() => setEditingMacros(false)} style={{ flex: 1 }}>Annuler</Button>
                    <Button mode="contained" onPress={handleSaveMacros} loading={saving} style={{ flex: 1 }}>Sauvegarder</Button>
                  </View>
                </>
              ) : (
                <>
                  <InfoRow label="Calories" value={`${macros?.calories ?? '-'} kcal`} />
                  <InfoRow label="Protéines" value={`${macros?.proteines_g ?? '-'} g`} />
                  <InfoRow label="Glucides" value={`${macros?.glucides_g ?? '-'} g`} />
                  <InfoRow label="Lipides" value={`${macros?.lipides_g ?? '-'} g`} />
                </>
              )}
            </Card.Content>
          </Card>

          {/* Compte */}
          <Card style={styles.card} mode="contained">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>Compte</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                {profile?.email}
              </Text>
              <Button mode="outlined" onPress={handleLogout} style={styles.accountButton}>
                Se déconnecter
              </Button>
              <Button mode="text" onPress={handleDeleteAccount} textColor={theme.colors.error} style={styles.accountButton}>
                Supprimer mon compte
              </Button>
            </Card.Content>
          </Card>

        </ScrollView>

        {/* Pop-up intro Profil */}
        <IntroModal
          visible={intro.visible}
          emoji="👤"
          title="Tes infos et tes objectifs"
          description="Ajuste ton profil et tes objectifs quand tu veux."
          sections={[
            { icon: '⚖️', title: 'Mes informations', body: "Ton poids, ta taille, ton âge et ton sexe, utilisés pour calculer tes besoins caloriques." },
            { icon: '🎯', title: 'Mon objectif', body: "Modifie ton poids cible et ton intention motivationnelle. Une fois la cible atteinte, tes calories passent automatiquement en mode maintien." },
            { icon: '🍽️', title: 'Objectifs journaliers', body: "Tes macros sont calculées automatiquement. Tu peux les ajuster manuellement si tu suis un régime spécifique." },
          ]}
          onValidate={intro.close}
          dismissable
          onDismiss={intro.close}
        />
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="bodyMedium" style={{ opacity: 0.6 }}>{label}</Text>
      <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

// Affiche la phase courante et le jour du cycle. Recalcule a la volee depuis
// la date des dernieres regles. La logique vit dans nutrition.ts via le store
// (macros.phaseCycle / macros.jourCycle) mais on la duplique ici pour ne pas
// dependre du dernier recalcul (utile si le user vient juste d'activer).
function CycleInfo({ profile }: { profile: { sexe: 'homme' | 'femme'; cycle_actif: boolean; cycle_dernieres_regles: string | null; cycle_duree_jours: number } }) {
  if (!profile.cycle_actif || !profile.cycle_dernieres_regles) return null;
  const debut = new Date(profile.cycle_dernieres_regles);
  const duree = profile.cycle_duree_jours;
  const joursEcoules = Math.floor((Date.now() - debut.getTime()) / (24 * 60 * 60 * 1000));
  const jourCycle = (joursEcoules % duree) + 1;
  let phase: 'menstruelle' | 'folliculaire' | 'ovulation' | 'luteale';
  if (jourCycle <= 5) phase = 'menstruelle';
  else if (jourCycle >= duree - 13 && jourCycle <= duree - 11) phase = 'ovulation';
  else if (jourCycle > duree - 11) phase = 'luteale';
  else phase = 'folliculaire';
  return (
    <>
      <InfoRow label="Phase actuelle" value={describePhase(phase)} />
      <InfoRow label="Jour" value={`${jourCycle} / ${duree}`} />
      {phase === 'luteale' && (
        <Text variant="bodySmall" style={{ color: '#4CAF50', marginTop: 8, fontStyle: 'italic' }}>
          Phase lutéale : +150 kcal/j appliqués à tes besoins.
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing['5xl'],
  },
  title: {
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  input: {
    marginBottom: 10,
  },
  dateBtn: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  skipLink: {
    textAlign: 'right',
    textDecorationLine: 'underline',
    marginTop: -4,
    marginBottom: 8,
  },
  sansCibleBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  sportTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  freqEditBlock: { marginBottom: 12 },
  freqEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  freqEditRow: {
    flexDirection: 'row',
    gap: 4,
  },
  freqEditOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  label: {
    marginBottom: 6,
    marginTop: 4,
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    borderRadius: 20,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  accountButton: {
    marginTop: 8,
  },
  version: {
    textAlign: 'center',
    marginTop: 16,
  },
});
