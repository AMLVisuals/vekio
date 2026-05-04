import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Keyboard, Pressable } from 'react-native';
import { Text, Card, Button, TextInput, IconButton, useTheme } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useUserStore } from '../../stores/userStore';
import { useWeightStore } from '../../stores/weightStore';
import { supabase } from '../../lib/supabase';
import type { Intention, Sport, SportType, Frequence } from '../../lib/nutrition';
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
  const saveProfile = useUserStore((s) => s.saveProfile);
  const logout = useUserStore((s) => s.logout);

  const [editingProfile, setEditingProfile] = useState(false);
  const [editingMacros, setEditingMacros] = useState(false);
  const [editingObjectif, setEditingObjectif] = useState(false);
  const [editingActivites, setEditingActivites] = useState(false);
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

  // Champs macros custom
  const [customCal, setCustomCal] = useState(String(macros?.calories ?? ''));
  const [customProt, setCustomProt] = useState(String(macros?.proteines_g ?? ''));
  const [customGluc, setCustomGluc] = useState(String(macros?.glucides_g ?? ''));
  const [customLip, setCustomLip] = useState(String(macros?.lipides_g ?? ''));

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
      });

      // Mettre a jour le poids dans l'historique si change
      if (Number(poids) !== profile?.poids) {
        await useWeightStore.getState().addWeight({ poids_kg: Number(poids), source: 'manuel' });
      }

      // Mettre a jour les champs macros avec les nouvelles valeurs calculees
      const newMacros = useUserStore.getState().macros;
      if (newMacros) {
        setCustomCal(String(newMacros.calories));
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

  const handleSaveMacros = async () => {
    const cal = Number(customCal);
    const prot = Number(customProt);
    const gluc = Number(customGluc);
    const lip = Number(customLip);

    if (!cal || !prot || !gluc || !lip) {
      Alert.alert('Erreur', 'Remplis tous les champs');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      await supabase
        .from('objectifs_macros')
        .upsert({
          user_id: user.id,
          calories: cal,
          proteines_g: prot,
          glucides_g: gluc,
          lipides_g: lip,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      const currentMacros = useUserStore.getState().macros;
      useUserStore.getState().setMacros({
        calories: cal,
        proteines_g: prot,
        glucides_g: gluc,
        lipides_g: lip,
        bmr: currentMacros?.bmr ?? 0,
        tdee: currentMacros?.tdee ?? 0,
        facteurActivite: currentMacros?.facteurActivite ?? 0,
        calculesSurMasseMaigre: currentMacros?.calculesSurMasseMaigre ?? false,
        objectifEffectif: currentMacros?.objectifEffectif ?? 'maintien',
        objectifAtteint: currentMacros?.objectifAtteint ?? false,
      });
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
      });
      setEditingObjectif(false);
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
                <Text variant="titleMedium" style={styles.cardTitle}>Objectifs journaliers</Text>
                {!editingMacros && (
                  <Button compact mode="text" onPress={() => setEditingMacros(true)}>
                    Modifier
                  </Button>
                )}
              </View>

              {editingMacros ? (
                <>
                  <TextInput label="Calories" value={customCal} onChangeText={setCustomCal} mode="outlined" dense keyboardType="numeric" right={<TextInput.Affix text="kcal" />} style={styles.input} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                  <TextInput label="Protéines" value={customProt} onChangeText={setCustomProt} mode="outlined" dense keyboardType="numeric" right={<TextInput.Affix text="g" />} style={styles.input} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                  <TextInput label="Glucides" value={customGluc} onChangeText={setCustomGluc} mode="outlined" dense keyboardType="numeric" right={<TextInput.Affix text="g" />} style={styles.input} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                  <TextInput label="Lipides" value={customLip} onChangeText={setCustomLip} mode="outlined" dense keyboardType="numeric" right={<TextInput.Affix text="g" />} style={styles.input} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />

                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic', marginBottom: 8 }}>
                    Modifie ces valeurs si tu veux des objectifs personnalisés. Sinon elles sont calculées automatiquement.
                  </Text>

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
