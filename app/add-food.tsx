import { useState } from 'react';
import { View, StyleSheet, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Card, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useJournalStore, type MealType } from '../stores/journalStore';

export default function AddFoodScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{
    meal: string;
    code: string;
    name: string;
    brand: string;
    calories: string;
    proteines: string;
    glucides: string;
    lipides: string;
  }>();

  const [quantite, setQuantite] = useState('100');
  const addEntry = useJournalStore((s) => s.addEntry);

  const q = Number(quantite) || 0;
  const ratio = q / 100;
  const cal = Math.round(Number(params.calories) * ratio);
  const prot = Math.round(Number(params.proteines) * ratio * 10) / 10;
  const gluc = Math.round(Number(params.glucides) * ratio * 10) / 10;
  const lip = Math.round(Number(params.lipides) * ratio * 10) / 10;

  const handleAdd = () => {
    addEntry({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      food_id: params.code,
      nom: params.name,
      quantite_g: q,
      calories: cal,
      proteines: prot,
      glucides: gluc,
      lipides: lip,
      repas: params.meal as MealType,
    });

    // Retourner au journal
    router.dismiss(2);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.content}>
            <Button icon="arrow-left" onPress={() => router.back()} compact style={styles.back}>
              Retour
            </Button>

            <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
              {params.name}
            </Text>
            {params.brand ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24 }}>
                {params.brand}
              </Text>
            ) : <View style={{ height: 24 }} />}

            <TextInput
              label="Quantité"
              value={quantite}
              onChangeText={setQuantite}
              mode="outlined"
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              right={<TextInput.Affix text="g" />}
              style={styles.input}
            />

            <View style={styles.quickButtons}>
              {[50, 100, 150, 200].map((g) => (
                <Button
                  key={g}
                  mode={quantite === String(g) ? 'contained' : 'outlined'}
                  compact
                  onPress={() => { setQuantite(String(g)); Keyboard.dismiss(); }}
                  style={styles.quickButton}
                >
                  {g}g
                </Button>
              ))}
            </View>

            <Card style={styles.macrosCard} mode="outlined">
              <Card.Content>
                <Text variant="titleMedium" style={{ textAlign: 'center', marginBottom: 16 }}>
                  Pour {q}g
                </Text>
                <View style={styles.macrosGrid}>
                  <MacroItem label="Calories" value={`${cal}`} unit="kcal" color={theme.colors.primary} />
                  <MacroItem label="Protéines" value={`${prot}`} unit="g" color="#4CAF50" />
                  <MacroItem label="Glucides" value={`${gluc}`} unit="g" color="#FF9800" />
                  <MacroItem label="Lipides" value={`${lip}`} unit="g" color="#2196F3" />
                </View>
              </Card.Content>
            </Card>
          </View>

          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={handleAdd}
              disabled={q <= 0}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Ajouter au journal
            </Button>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

function MacroItem({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={styles.macroItem}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginBottom: 4 }} />
      <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>{value}</Text>
      <Text variant="bodySmall" style={{ opacity: 0.6 }}>{unit}</Text>
      <Text variant="bodySmall" style={{ opacity: 0.6 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  back: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 12,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  quickButton: {
    flex: 1,
  },
  macrosCard: {
    marginBottom: 16,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  button: {
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});
