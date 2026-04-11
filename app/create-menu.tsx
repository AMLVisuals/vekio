import { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Text, TextInput, Button, Card, IconButton, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMenusStore, type MenuAliment } from '../stores/menusStore';
import { useJournalStore, MEAL_LABELS, type MealType } from '../stores/journalStore';

export default function CreateMenuScreen() {
  const theme = useTheme();
  const { entries } = useJournalStore();
  const addMenu = useMenusStore((s) => s.addMenu);

  const [nom, setNom] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [aliments, setAliments] = useState<MenuAliment[]>([]);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission nécessaire', 'Autorise la caméra pour prendre une photo');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const importFromJournal = () => {
    if (entries.length === 0) {
      Alert.alert('Journal vide', 'Ajoute des aliments dans ton journal d\'abord');
      return;
    }

    const meals: MealType[] = ['petit_dejeuner', 'dejeuner', 'diner', 'collation'];
    const options = meals
      .filter((meal) => entries.some((e) => e.repas === meal))
      .map((meal) => ({
        text: MEAL_LABELS[meal],
        onPress: () => {
          const imported: MenuAliment[] = entries
            .filter((e) => e.repas === meal)
            .map((e) => ({
              food_id: e.food_id,
              nom: e.nom,
              quantite_g: e.quantite_g,
              calories: e.calories,
              proteines: e.proteines,
              glucides: e.glucides,
              lipides: e.lipides,
            }));
          setAliments(imported);
        },
      }));

    options.push({ text: 'Annuler', onPress: () => {} });

    Alert.alert('Importer quel repas ?', 'Choisis le repas à sauvegarder', options);
  };

  const removeAliment = (index: number) => {
    setAliments(aliments.filter((_, i) => i !== index));
  };

  const totalCal = aliments.reduce((s, a) => s + a.calories, 0);

  const handleSave = async () => {
    if (!nom.trim()) {
      Alert.alert('Nom requis', 'Donne un nom à ton menu');
      return;
    }
    if (aliments.length === 0) {
      Alert.alert('Aliments requis', 'Ajoute au moins un aliment');
      return;
    }

    setLoading(true);
    await addMenu(nom.trim(), aliments, photoUri);
    setLoading(false);
    router.back();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Button icon="arrow-left" onPress={() => router.back()} compact style={styles.back}>
            Retour
          </Button>

          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
            Nouveau menu
          </Text>

          <TextInput
            label="Nom du menu"
            value={nom}
            onChangeText={setNom}
            mode="outlined"
            placeholder="Ex: Petit-déj protéiné"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            style={styles.input}
          />

          {/* Photo */}
          {photoUri ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUri }} style={styles.photo} />
              <IconButton
                icon="close"
                size={20}
                style={styles.removePhoto}
                onPress={() => setPhotoUri(null)}
              />
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <Button mode="outlined" icon="camera" onPress={takePhoto} style={styles.photoButton}>
                Photo
              </Button>
              <Button mode="outlined" icon="image" onPress={pickImage} style={styles.photoButton}>
                Galerie
              </Button>
            </View>
          )}

          {/* Aliments */}
          <View style={styles.alimentsHeader}>
            <Text variant="titleMedium" style={{ fontWeight: '600' }}>
              Aliments ({aliments.length})
            </Text>
            <Button mode="contained-tonal" compact onPress={importFromJournal}>
              Importer du journal
            </Button>
          </View>

          {aliments.length === 0 ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic', marginBottom: 16 }}>
              Importe les aliments depuis ton journal du jour
            </Text>
          ) : (
            <Card style={styles.alimentsCard} mode="outlined">
              <Card.Content>
                {aliments.map((aliment, index) => (
                  <View key={index} style={[styles.alimentRow, index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant }]}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" numberOfLines={1}>{aliment.nom}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {aliment.quantite_g}g — {Math.round(aliment.calories)} kcal
                      </Text>
                    </View>
                    <IconButton icon="close" size={16} onPress={() => removeAliment(index)} />
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>Total</Text>
                  <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>{Math.round(totalCal)} kcal</Text>
                </View>
              </Card.Content>
            </Card>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Sauvegarder le menu
          </Button>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  back: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
  },
  photoContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  photoButton: {
    flex: 1,
  },
  alimentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alimentsCard: {
    marginBottom: 16,
  },
  alimentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 2,
    borderTopColor: '#ddd',
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
