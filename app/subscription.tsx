import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { restorePurchases } from '../lib/purchases';

const PLANS = [
  { id: 'monthly', label: 'Mensuel', price: '2,99 €', period: '/mois', savings: null },
  { id: 'annual', label: 'Annuel', price: '24,99 €', period: '/an', savings: 'Économise 30%', recommended: true },
  { id: 'lifetime', label: 'À vie', price: '49,99 €', period: 'paiement unique', savings: 'Meilleure offre' },
];

export default function SubscriptionScreen() {
  const theme = useTheme();
  const [selected, setSelected] = useState('annual');
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    // En production, utiliser purchasePackage() de lib/purchases.ts
    Alert.alert(
      'Dev mode',
      'Les achats ne fonctionnent pas dans Expo Go. Ils seront actifs dans le build de production.'
    );
  };

  const handleRestore = async () => {
    setLoading(true);
    const restored = await restorePurchases();
    setLoading(false);

    if (restored) {
      Alert.alert('Achats restaurés', 'Ton abonnement Pro a été restauré.');
      router.back();
    } else {
      Alert.alert('Aucun achat', 'Aucun abonnement trouvé pour ce compte.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Button icon="arrow-left" onPress={() => router.back()} compact style={styles.back}>
        Retour
      </Button>

      <View style={styles.content}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
          Vekio Pro
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Débloque toutes les fonctionnalités
        </Text>

        <View style={styles.plans}>
          {PLANS.map((plan) => {
            const isSelected = selected === plan.id;
            return (
              <Card
                key={plan.id}
                style={[
                  styles.planCard,
                  {
                    borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                mode="outlined"
                onPress={() => setSelected(plan.id)}
              >
                <Card.Content style={styles.planContent}>
                  {plan.recommended && (
                    <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                      <Text variant="labelSmall" style={{ color: '#fff', fontWeight: 'bold' }}>RECOMMANDÉ</Text>
                    </View>
                  )}
                  <Text variant="titleMedium" style={{ fontWeight: '600' }}>{plan.label}</Text>
                  <View style={styles.priceRow}>
                    <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                      {plan.price}
                    </Text>
                    <Text variant="bodySmall" style={{ opacity: 0.6, marginLeft: 4 }}>{plan.period}</Text>
                  </View>
                  {plan.savings && (
                    <Text variant="bodySmall" style={{ color: '#4CAF50', fontWeight: '600' }}>
                      {plan.savings}
                    </Text>
                  )}
                </Card.Content>
              </Card>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handlePurchase}
          loading={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          S'abonner
        </Button>
        <Button mode="text" onPress={handleRestore}>
          Restaurer mes achats
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  back: {
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 32,
  },
  plans: {
    gap: 12,
  },
  planCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  planContent: {
    paddingVertical: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  button: {
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});
