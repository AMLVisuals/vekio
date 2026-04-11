import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useUserStore } from '../stores/userStore';

export default function Index() {
  const { isAuthenticated, isLoading, hasCompletedOnboarding, checkSession } = useUserStore();

  useEffect(() => {
    checkSession();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!hasCompletedOnboarding) {
    return <Redirect href="/(auth)/onboarding-objectif" />;
  }

  return <Redirect href="/(tabs)" />;
}
