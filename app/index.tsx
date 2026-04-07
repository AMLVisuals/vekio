import { Redirect } from 'expo-router';

export default function Index() {
  // TODO Phase 1 : rediriger vers (tabs) si connecte, (auth) sinon
  return <Redirect href="/(tabs)" />;
}
