import { View, StyleSheet, Modal } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { router } from 'expo-router';

interface UpgradeModalProps {
  visible: boolean;
  onDismiss: () => void;
  feature: string;
}

export default function UpgradeModal({ visible, onDismiss, feature }: UpgradeModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.primary }]}>
              Passe à Vekio Pro
            </Text>

            <Text variant="bodyMedium" style={styles.subtitle}>
              {feature} est une fonctionnalité Pro.
            </Text>

            <View style={styles.features}>
              <FeatureRow text="Aliments favoris illimités" />
              <FeatureRow text="Statistiques sur 30 jours" />
              <FeatureRow text="Copier les repas des jours précédents" />
              <FeatureRow text="Menus illimités" />
              <FeatureRow text="Aucune publicité" />
            </View>

            <Button
              mode="contained"
              onPress={() => {
                onDismiss();
                router.push('/subscription');
              }}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Voir les offres
            </Button>

            <Button mode="text" onPress={onDismiss} style={styles.dismiss}>
              Plus tard
            </Button>
          </Card.Content>
        </Card>
      </View>
    </Modal>
  );
}

function FeatureRow({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text variant="bodyMedium" style={{ color: '#4CAF50' }}>✓</Text>
      <Text variant="bodyMedium" style={{ marginLeft: 8 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 16,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 20,
  },
  features: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  button: {
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  dismiss: {
    marginTop: 8,
  },
});
