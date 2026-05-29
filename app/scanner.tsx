import { useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { getProductByBarcode } from '../lib/openfoodfacts';

export default function ScannerScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ meal: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scannedRef = useRef(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scannedRef.current || loading) return;
    scannedRef.current = true;
    setLoading(true);
    setError('');

    const product = await getProductByBarcode(data);

    if (product) {
      const optStr = (v: number | undefined): string | undefined => v !== undefined ? String(v) : undefined;
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
          cholesterol: optStr(product.cholesterol),
          sodium: optStr(product.sodium),
          calcium: optStr(product.calcium),
          fer: optStr(product.fer),
          potassium: optStr(product.potassium),
        },
      });
    } else {
      setError('Produit non trouvé dans la base Open Food Facts');
      setLoading(false);
      scannedRef.current = false;
    }
  };

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge" style={{ textAlign: 'center', marginBottom: 16, paddingHorizontal: 24 }}>
          L'accès à la caméra est nécessaire pour scanner les codes-barres
        </Text>
        <Button mode="contained" onPress={requestPermission}>
          Autoriser la caméra
        </Button>
        <Button mode="text" onPress={() => router.back()} style={{ marginTop: 12 }}>
          Retour
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={handleBarCodeScanned}
      />

      <SafeAreaView style={styles.overlay}>
        <Button
          icon="arrow-left"
          mode="contained-tonal"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          Retour
        </Button>

        <View style={styles.scanArea}>
          <View style={[styles.scanFrame, { borderColor: loading ? theme.colors.primary : '#fff' }]} />
        </View>

        <View style={styles.bottom}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : error ? (
            <Text variant="bodyLarge" style={styles.errorText}>{error}</Text>
          ) : (
            <Text variant="bodyLarge" style={styles.hintText}>
              Scanne le code-barres d'un produit
            </Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  backButton: {
    alignSelf: 'flex-start',
    margin: 16,
  },
  scanArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 260,
    height: 160,
    borderWidth: 3,
    borderRadius: 16,
  },
  bottom: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  hintText: {
    color: '#fff',
    textAlign: 'center',
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
