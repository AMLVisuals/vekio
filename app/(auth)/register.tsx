import { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, View } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors as tokens, palette } from '../../theme/tokens';

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
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
          <View style={[
            styles.checkbox,
            consentCGU && { backgroundColor: palette.primary500, borderColor: palette.primary500 },
          ]}>
            {consentCGU && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
          <Text variant="bodySmall" style={styles.checkboxText}>
            J'accepte les Conditions Générales d'Utilisation et la Politique de Confidentialité
          </Text>
        </Pressable>

        <Pressable onPress={() => setConsentHealth(!consentHealth)} style={styles.checkboxRow}>
          <View style={[
            styles.checkbox,
            consentHealth && { backgroundColor: palette.primary500, borderColor: palette.primary500 },
          ]}>
            {consentHealth && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
          <Text variant="bodySmall" style={styles.checkboxText}>
            J'autorise le traitement de mes données nutritionnelles et de santé (article 9 RGPD)
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
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
    gap: 12,
    marginBottom: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: palette.neutral400,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  checkboxText: {
    flex: 1,
    color: tokens.textSecondary,
    lineHeight: 17,
  },
});
