import { Stack } from 'expo-router';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;

  return (
    <PaperProvider theme={theme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="search-food" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="add-food" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="scanner" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="create-menu" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="share-menu" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="subscription" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="peser" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="import-pesees" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </PaperProvider>
  );
}
