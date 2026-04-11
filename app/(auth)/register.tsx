import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { Text, TextInput, Button, Checkbox, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function RegisterScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [consentHealth, setConsentHealth] = useState(false);
  const [consentCGU, setConsentCGU] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      setError('Remplis tous les champs');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (!consentCGU || !consentHealth) {
      setError('Tu dois accepter les conditions et le traitement des données');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError('Un compte existe déjà avec cet email');
      } else {
        setError('Erreur lors de l\'inscription');
      }
      setLoading(false);
      return;
    }

    setLoading(false);
    router.replace('/(auth)/onboarding-objectif');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.primary }]}>
          Créer un compte
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Commence ton suivi nutritionnel
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

        <TextInput
          label="Confirmer le mot de passe"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          mode="outlined"
          secureTextEntry
          style={styles.input}
        />

        <Pressable onPress={() => setConsentCGU(!consentCGU)} style={styles.checkboxRow}>
          <Checkbox status={consentCGU ? 'checked' : 'unchecked'} onPress={() => setConsentCGU(!consentCGU)} />
          <Text variant="bodySmall" style={styles.checkboxText}>
            J'accepte les Conditions Générales d'Utilisation et la Politique de Confidentialité
          </Text>
        </Pressable>

        <Pressable onPress={() => setConsentHealth(!consentHealth)} style={styles.checkboxRow}>
          <Checkbox status={consentHealth ? 'checked' : 'unchecked'} onPress={() => setConsentHealth(!consentHealth)} />
          <Text variant="bodySmall" style={styles.checkboxText}>
            J'autorise le traitement de mes données nutritionnelles et de santé (Article 9 RGPD)
          </Text>
        </Pressable>

        <Button
          mode="contained"
          onPress={handleRegister}
          loading={loading}
          disabled={loading || !consentCGU || !consentHealth}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          S'inscrire
        </Button>

        <Button
          mode="text"
          onPress={() => router.back()}
          style={styles.link}
        >
          Déjà un compte ? Se connecter
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxText: {
    flex: 1,
    opacity: 0.7,
  },
});
