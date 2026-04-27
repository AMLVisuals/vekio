import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="onboarding-objectif" />
      <Stack.Screen name="onboarding-mensurations" />
      <Stack.Screen name="onboarding-composition" />
      <Stack.Screen name="onboarding-activite" />
      <Stack.Screen name="onboarding-recap" />
    </Stack>
  );
}
