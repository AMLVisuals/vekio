import { useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { getProductByBarcode, type NutritionData } from '../lib/openfoodfacts';
import { getPersonalProduct } from '../lib/personalProducts';
import { getCommunityProduct } from '../lib/communityProducts';

export default function ScannerScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ meal: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  // Code-barres non trouve : on garde le code pour proposer la saisie manuelle.
  const [notFoundCode, setNotFoundCode] = useState('');
  const scannedRef = useRef(false);

  const goToAddFood = (product: NutritionData) => {
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
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scannedRef.current || loading) return;
    scannedRef.current = true;
    setLoading(true);
    setNotFoundCode('');

    // Chaine de repli, dans l'ordre :
    // 1. Open Food Facts (base publique mondiale).
    // 2. Mes produits perso (saisies a la main, exactes pour moi).
    // 3. Base communautaire (saisies partagees par les autres users Vekio).
    // (FatSecret s'intercalera apres OFF quand l'offre Premier sera active.)
    const product =
      (await getProductByBarcode(data)) ??
      (await getPersonalProduct(data)) ??
      (await getCommunityProduct(data));

    if (product) {
      goToAddFood(product);
    } else {
      setNotFoundCode(data);
      setLoading(false);
      scannedRef.current = false;
    }
  };

  const handleManualEntry = () => {
    router.replace({
      pathname: '/add-manual',
      params: { meal: params.meal, code: notFoundCode },
    });
  };

  const handleRetry = () => {
    setNotFoundCode('');
    scannedRef.current = false;
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
        // On coupe la detection des qu'un resultat est en cours (loading) ou
        // affiche (notFoundCode) : sinon la camera mitraille des evenements en
        // boucle et sature le thread JS -> les boutons (Retour) deviennent laggy.
        onBarcodeScanned={loading || notFoundCode ? undefined : handleBarCodeScanned}
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
          ) : notFoundCode ? (
            <View style={styles.notFoundBox}>
              <Text variant="bodyLarge" style={styles.errorText}>
                Produit introuvable dans Open Food Facts
              </Text>
              <Text variant="bodySmall" style={styles.hintText}>
                Tu peux le saisir à la main : ce sera mémorisé pour tes prochains scans.
              </Text>
              <Button
                icon="pencil-plus"
                mode="contained"
                onPress={handleManualEntry}
                style={{ marginTop: 16, alignSelf: 'stretch' }}
              >
                Saisir manuellement
              </Button>
              <Button
                icon="barcode-scan"
                mode="text"
                textColor="#fff"
                onPress={handleRetry}
                style={{ marginTop: 4 }}
              >
                Scanner un autre produit
              </Button>
            </View>
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
    paddingHorizontal: 24,
  },
  notFoundBox: {
    alignItems: 'center',
    alignSelf: 'stretch',
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
