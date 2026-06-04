import { useState } from 'react';
import { View, StyleSheet, ScrollView, Keyboard, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Text, TextInput, Button, useTheme, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { savePersonalProduct } from '../lib/personalProducts';
import { saveCommunityProduct } from '../lib/communityProducts';
import type { NutritionData } from '../lib/openfoodfacts';

// Saisie manuelle d'un produit absent d'Open Food Facts (typiquement whey /
// produits sport). Les valeurs sont POUR 100 g, comme sur l'etiquette. Le produit
// est memorise (lie a son code-barres) pour etre retrouve au prochain scan.
export default function AddManualScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ meal: string; code: string }>();

  const [nom, setNom] = useState('');
  const [marque, setMarque] = useState('');
  const [calories, setCalories] = useState('');
  const [proteines, setProteines] = useState('');
  const [glucides, setGlucides] = useState('');
  const [lipides, setLipides] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [fibres, setFibres] = useState('');
  const [sucres, setSucres] = useState('');
  const [ags, setAgs] = useState('');
  const [sodium, setSodium] = useState('');
  const [touched, setTouched] = useState(false);

  // Champ optionnel -> number | undefined (vide = non renseigne)
  const opt = (v: string): number | undefined => {
    const t = v.replace(',', '.').trim();
    return t === '' ? undefined : Number(t);
  };
  // Champ requis -> number (vide ou invalide = 0)
  const req = (v: string): number => {
    const n = Number(v.replace(',', '.').trim());
    return Number.isFinite(n) ? n : 0;
  };

  const nomValide = nom.trim().length > 0;
  const caloriesValide = req(calories) > 0;
  const canSave = nomValide && caloriesValide;

  const handleSave = async () => {
    setTouched(true);
    if (!canSave) return;
    Keyboard.dismiss();

    const product: NutritionData = {
      code: params.code ?? '',
      name: nom.trim(),
      brand: marque.trim(),
      calories: req(calories),
      proteines: req(proteines),
      glucides: req(glucides),
      lipides: req(lipides),
      image_url: null,
      fibres: opt(fibres),
      sucres: opt(sucres),
      ags: opt(ags),
      sodium: opt(sodium),
    };

    // Memorise pour les futurs scans (ne bloque pas la navigation si echec) :
    // - perso : ma copie exacte, retrouvee a mon prochain scan.
    // - communaute : partagee avec tous les users Vekio (facon MyFitnessPal).
    if (product.code) {
      savePersonalProduct(product);
      saveCommunityProduct(product);
    }

    const optStr = (v: number | undefined) => (v !== undefined ? String(v) : undefined);
    router.replace({
      pathname: '/add-food',
      params: {
        meal: params.meal,
        code: product.code,
        name: product.name,
        brand: product.brand,
        calories: String(product.calories),
        proteines: String(product.proteines),
        glucides: String(product.glucides),
        lipides: String(product.lipides),
        fibres: optStr(product.fibres),
        sucres: optStr(product.sucres),
        ags: optStr(product.ags),
        sodium: optStr(product.sodium),
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.headerRow}>
          <Button icon="arrow-left" onPress={() => router.back()} compact>
            Retour
          </Button>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
            Nouveau produit
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>
            Recopie les valeurs de l'étiquette, pour 100 g. Tu ne le saisiras qu'une seule fois :
            le produit sera retrouvé automatiquement au prochain scan.
          </Text>

          <TextInput
            label="Nom du produit"
            value={nom}
            onChangeText={setNom}
            mode="outlined"
            style={styles.input}
            error={touched && !nomValide}
          />
          <TextInput
            label="Marque (optionnel)"
            value={marque}
            onChangeText={setMarque}
            mode="outlined"
            style={styles.input}
          />

          <Text variant="titleSmall" style={[styles.section, { color: theme.colors.onSurfaceVariant }]}>
            Valeurs pour 100 g
          </Text>

          <TextInput
            label="Calories (kcal)"
            value={calories}
            onChangeText={setCalories}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
            right={<TextInput.Affix text="kcal" />}
            error={touched && !caloriesValide}
          />
          <View style={styles.row}>
            <TextInput
              label="Protéines"
              value={proteines}
              onChangeText={setProteines}
              mode="outlined"
              keyboardType="numeric"
              style={styles.rowInput}
              right={<TextInput.Affix text="g" />}
            />
            <TextInput
              label="Glucides"
              value={glucides}
              onChangeText={setGlucides}
              mode="outlined"
              keyboardType="numeric"
              style={styles.rowInput}
              right={<TextInput.Affix text="g" />}
            />
          </View>
          <TextInput
            label="Lipides"
            value={lipides}
            onChangeText={setLipides}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
            right={<TextInput.Affix text="g" />}
          />

          <Pressable
            onPress={() => setShowDetails(!showDetails)}
            style={[styles.detailsToggle, { borderTopColor: theme.colors.outlineVariant }]}
          >
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
              Détails (optionnel)
            </Text>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {showDetails ? '▲' : '▼'}
            </Text>
          </Pressable>
          {showDetails ? (
            <View style={{ marginTop: 12 }}>
              <View style={styles.row}>
                <TextInput
                  label="Fibres"
                  value={fibres}
                  onChangeText={setFibres}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.rowInput}
                  right={<TextInput.Affix text="g" />}
                />
                <TextInput
                  label="Sucres"
                  value={sucres}
                  onChangeText={setSucres}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.rowInput}
                  right={<TextInput.Affix text="g" />}
                />
              </View>
              <View style={styles.row}>
                <TextInput
                  label="AG saturés"
                  value={ags}
                  onChangeText={setAgs}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.rowInput}
                  right={<TextInput.Affix text="g" />}
                />
                <TextInput
                  label="Sodium"
                  value={sodium}
                  onChangeText={setSodium}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.rowInput}
                  right={<TextInput.Affix text="mg" />}
                />
              </View>
            </View>
          ) : null}

          {touched && !canSave ? (
            <HelperText type="error" visible>
              Renseigne au moins le nom et les calories.
            </HelperText>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleSave}
            disabled={!canSave}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Continuer
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { paddingHorizontal: 8, paddingTop: 4 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  title: { fontWeight: 'bold', marginBottom: 4 },
  input: { marginBottom: 12 },
  section: { marginTop: 8, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  rowInput: { flex: 1, marginBottom: 12 },
  detailsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  footer: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8 },
  button: { borderRadius: 8 },
  buttonContent: { paddingVertical: 6 },
});
