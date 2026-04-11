import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useUserStore } from '../../stores/userStore';

export default function LoginScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Remplis tous les champs');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      setError('Email ou mot de passe incorrect');
      setLoading(false);
      return;
    }

    await useUserStore.getState().checkSession();
    setLoading(false);

    const { hasCompletedOnboarding } = useUserStore.getState();
    if (hasCompletedOnboarding) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/onboarding-objectif');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.primary }]}>
          Vekio
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Connecte-toi pour continuer
        </Text>

        {error ? (
          <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>
        ) : null}

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={styles.input}
        />

        <TextInput
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Se connecter
        </Button>

        <Button
          mode="text"
          onPress={() => router.push('/(auth)/register')}
          style={styles.link}
        >
          Pas encore de compte ? S'inscrire
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  error: {
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  link: {
    marginTop: 16,
  },
});
