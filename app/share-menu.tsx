import { useRef, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Button, SegmentedButtons, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useMenusStore } from '../stores/menusStore';

export default function ShareMenuScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ menuId: string }>();
  const menu = useMenusStore((s) => s.menus.find((m) => m.id === params.menuId));
  const viewShotRef = useRef<ViewShot>(null);
  const [style, setStyle] = useState('light');
  const [sharing, setSharing] = useState(false);

  if (!menu) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>Menu introuvable</Text>
        <Button onPress={() => router.back()}>Retour</Button>
      </SafeAreaView>
    );
  }

  const isDark = style === 'dark';
  const bg = isDark ? '#1c1c1e' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1c1c1e';
  const subtextColor = isDark ? '#a0a0a0' : '#666666';
  const cardBg = isDark ? '#2c2c2e' : '#f5f5f5';

  const handleShare = async () => {
    if (!viewShotRef.current?.capture) return;
    setSharing(true);
    try {
      const uri = await viewShotRef.current.capture();
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch (e) {
      // ignore
    }
    setSharing(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Button icon="arrow-left" onPress={() => router.back()} compact>
          Retour
        </Button>
      </View>

      <View style={styles.styleSelector}>
        <SegmentedButtons
          value={style}
          onValueChange={setStyle}
          buttons={[
            { value: 'light', label: 'Clair' },
            { value: 'dark', label: 'Sombre' },
          ]}
        />
      </View>

      <View style={styles.cardContainer}>
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
          <View style={[styles.shareCard, { backgroundColor: bg }]}>
            {menu.photo_url && (
              <View style={{ backgroundColor: cardBg }}>
                <Image source={{ uri: menu.photo_url }} style={styles.sharePhoto} />
              </View>
            )}

            <View style={styles.shareContent}>
              <Text style={[styles.shareName, { color: textColor }]}>{menu.nom}</Text>

              {menu.aliments.map((aliment, i) => (
                <Text key={i} style={[styles.shareAliment, { color: subtextColor }]}>
                  • {aliment.nom} ({aliment.quantite_g}g)
                </Text>
              ))}

              <View style={styles.shareMacros}>
                <MacroBox label="kcal" value={Math.round(menu.total_calories)} bg={cardBg} color={textColor} />
                <MacroBox label="Prot" value={Math.round(menu.total_proteines)} bg={cardBg} color={textColor} unit="g" />
                <MacroBox label="Gluc" value={Math.round(menu.total_glucides)} bg={cardBg} color={textColor} unit="g" />
                <MacroBox label="Lip" value={Math.round(menu.total_lipides)} bg={cardBg} color={textColor} unit="g" />
              </View>

              <Text style={[styles.shareLogo, { color: subtextColor }]}>Vekio</Text>
            </View>
          </View>
        </ViewShot>
      </View>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleShare}
          loading={sharing}
          disabled={sharing}
          icon="share"
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Partager
        </Button>
      </View>
    </SafeAreaView>
  );
}

function MacroBox({ label, value, bg, color, unit }: { label: string; value: number; bg: string; color: string; unit?: string }) {
  return (
    <View style={[styles.macroBox, { backgroundColor: bg }]}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color }}>{value}{unit ?? ''}</Text>
      <Text style={{ fontSize: 11, color, opacity: 0.6 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 8,
  },
  styleSelector: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  shareCard: {
    width: 300,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  sharePhoto: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
  },
  shareContent: {
    padding: 20,
  },
  shareName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  shareAliment: {
    fontSize: 13,
    marginBottom: 4,
  },
  shareMacros: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  macroBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  shareLogo: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 16,
    letterSpacing: 2,
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
