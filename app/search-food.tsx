import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text, TextInput, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { type NutritionData } from '../lib/openfoodfacts';
import { searchCiqual } from '../lib/ciqual';
import { supabase } from '../lib/supabase';
import type { MealType } from '../stores/journalStore';

export default function SearchFoodScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ meal: string }>();
  const meal = params.meal as MealType;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NutritionData[]>([]);
  const [favoris, setFavoris] = useState<NutritionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchingRef = useRef(false);

  useEffect(() => {
    const loadFavoris = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('aliments_favoris')
        .select('*')
        .eq('user_id', user.id)
        .order('nb_utilisations', { ascending: false })
        .limit(10);

      if (data) {
        setFavoris(data.map((row) => ({
          code: row.food_id ?? '',
          name: row.nom,
          brand: '',
          calories: Number(row.calories),
          proteines: Number(row.proteines_g),
          glucides: Number(row.glucides_g),
          lipides: Number(row.lipides_g),
          fibres: row.fibres_g != null ? Number(row.fibres_g) : undefined,
          sucres: row.sucres_g != null ? Number(row.sucres_g) : undefined,
          ags: row.ags_g != null ? Number(row.ags_g) : undefined,
          cholesterol: row.cholesterol_mg != null ? Number(row.cholesterol_mg) : undefined,
          sodium: row.sodium_mg != null ? Number(row.sodium_mg) : undefined,
          calcium: row.calcium_mg != null ? Number(row.calcium_mg) : undefined,
          fer: row.fer_mg != null ? Number(row.fer_mg) : undefined,
          potassium: row.potassium_mg != null ? Number(row.potassium_mg) : undefined,
          image_url: null,
        })));
      }
    };
    loadFavoris();
  }, []);

  const handleSearch = async () => {
    if (!query.trim() || searchingRef.current) return;
    searchingRef.current = true;
    setLoading(true);
    setSearched(true);
    try {
      const data = searchCiqual(query.trim());
      setResults(data);
    } finally {
      setLoading(false);
      searchingRef.current = false;
    }
  };

  const selectFood = (food: NutritionData) => {
    const optStr = (v: number | undefined): string | undefined => v !== undefined ? String(v) : undefined;
    router.push({
      pathname: '/add-food',
      params: {
        meal,
        code: food.code,
        name: food.name,
        brand: food.brand,
        calories: String(food.calories),
        proteines: String(food.proteines),
        glucides: String(food.glucides),
        lipides: String(food.lipides),
        fibres: optStr(food.fibres),
        sucres: optStr(food.sucres),
        ags: optStr(food.ags),
        cholesterol: optStr(food.cholesterol),
        sodium: optStr(food.sodium),
        calcium: optStr(food.calcium),
        fer: optStr(food.fer),
        potassium: optStr(food.potassium),
      },
    });
  };

  const displayList = searched ? results : favoris;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Button icon="arrow-left" onPress={() => router.back()} compact>
          Retour
        </Button>
        <Button
          icon="barcode-scan"
          onPress={() => router.push({ pathname: '/scanner', params: { meal } })}
          compact
        >
          Scanner
        </Button>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          placeholder="Rechercher un aliment…"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          mode="outlined"
          style={styles.searchInput}
          returnKeyType="search"
        />
        <Button mode="contained" onPress={handleSearch} style={styles.searchButton}>
          OK
        </Button>
      </View>

      {!searched && favoris.length > 0 && (
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
          Aliments fréquents
        </Text>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item, index) => `${item.code}-${index}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable onPress={() => selectFood(item)}>
              <View style={[styles.foodItem, { borderBottomColor: theme.colors.outlineVariant }]}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyLarge" numberOfLines={2}>{item.name}</Text>
                  {item.brand && item.brand !== 'Ciqual (ANSES)' ? (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {item.brand}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.macrosPreview}>
                  <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                    {item.calories} kcal
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    /100g
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            searched ? (
              <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
                Aucun résultat trouvé
              </Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
  },
  searchButton: {
    borderRadius: 8,
    marginTop: 6,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  list: {
    paddingHorizontal: 16,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  macrosPreview: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
});
