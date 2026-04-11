import { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable, Alert, Dimensions } from 'react-native';
import { Text, Card, Button, IconButton, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMenusStore, type Menu } from '../../stores/menusStore';
import { useJournalStore, type MealType } from '../../stores/journalStore';

export default function MenusScreen() {
  const theme = useTheme();
  const { menus, isLoading, loadMenus } = useMenusStore();

  useEffect(() => {
    loadMenus();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
            Mes menus
          </Text>
          <Button
            mode="contained"
            compact
            onPress={() => router.push('/create-menu')}
            icon="plus"
          >
            Créer
          </Button>
        </View>

        {menus.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              Aucun menu sauvegardé
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
              Crée un menu pour sauvegarder tes repas favoris et les ajouter en un tap
            </Text>
          </View>
        )}

        <View style={styles.grid}>
          {menus.map((menu) => (
            <MenuCard key={menu.id} menu={menu} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuCard({ menu }: { menu: Menu }) {
  const theme = useTheme();
  const removeMenu = useMenusStore((s) => s.removeMenu);
  const updatePhoto = useMenusStore((s) => s.updatePhoto);
  const addEntry = useJournalStore((s) => s.addEntry);

  const handleUseMenu = (meal: MealType) => {
    menu.aliments.forEach((aliment) => {
      addEntry({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        food_id: aliment.food_id,
        nom: aliment.nom,
        quantite_g: aliment.quantite_g,
        calories: aliment.calories,
        proteines: aliment.proteines,
        glucides: aliment.glucides,
        lipides: aliment.lipides,
        repas: meal,
      });
    });
    Alert.alert('Menu ajouté', `${menu.nom} a été ajouté à ton journal`);
  };

  const handlePress = () => {
    Alert.alert(
      menu.nom,
      `${Math.round(menu.total_calories)} kcal — ${menu.aliments.length} aliment(s)`,
      [
        { text: 'Petit-déj', onPress: () => handleUseMenu('petit_dejeuner') },
        { text: 'Déjeuner', onPress: () => handleUseMenu('dejeuner') },
        { text: 'Dîner', onPress: () => handleUseMenu('diner') },
        { text: 'Collation', onPress: () => handleUseMenu('collation') },
        { text: 'Modifier photo', onPress: () => handleChangePhoto() },
        { text: 'Partager', onPress: () => router.push({ pathname: '/share-menu', params: { menuId: menu.id } }) },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const handleChangePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled) {
      await updatePhoto(menu.id, result.assets[0].uri);
    }
  };

  const handleDelete = () => {
    Alert.alert('Supprimer', `Supprimer le menu "${menu.nom}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeMenu(menu.id) },
    ]);
  };

  return (
    <Pressable onPress={handlePress} style={styles.cardWrapper}>
      <Card style={styles.menuCard} mode="outlined">
        {menu.photo_url ? (
          <Image source={{ uri: menu.photo_url }} style={styles.menuPhoto} resizeMode="cover" />
        ) : (
          <View style={[styles.menuPhoto, { backgroundColor: theme.colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' }]}>
            <Text variant="headlineLarge" style={{ opacity: 0.3 }}>🍽</Text>
          </View>
        )}
        <Card.Content style={styles.menuContent}>
          <Text variant="titleSmall" numberOfLines={1} style={{ fontWeight: '600' }}>
            {menu.nom}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {Math.round(menu.total_calories)} kcal
          </Text>
        </Card.Content>
        <IconButton
          icon="close"
          size={16}
          style={styles.deleteButton}
          onPress={handleDelete}
        />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontWeight: 'bold',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardWrapper: {
    width: (Dimensions.get('window').width - 52) / 2,
  },
  menuCard: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  menuPhoto: {
    width: '100%',
    height: 130,
    resizeMode: 'cover',
  },
  menuContent: {
    paddingVertical: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    margin: 4,
  },
});
