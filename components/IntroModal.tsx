// =============================================================================
// IntroModal — pop-up d'introduction reutilisable par onglet
// =============================================================================
// Pattern unique pour les intros first-visit + reouverture via bouton info.
// L'ecran consommateur passe le contenu pedagogique (sections), un emoji,
// un titre, et eventuellement un children (ex: selecteurs jour/heure pour
// Stats). Le bouton de validation prend une action et un label custom.

import { ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Portal, Modal, Button } from 'react-native-paper';
import { colors, spacing, radius } from '../theme/tokens';

export interface IntroSection {
  icon?: string;       // emoji ou caractere unique
  title?: string;      // titre court de la section
  body: string;        // corps explicatif
}

interface IntroModalProps {
  visible: boolean;
  emoji: string;
  title: string;
  description: string;
  sections?: IntroSection[];
  /** Contenu custom additionnel (ex: selecteurs jour/heure de Stats) */
  children?: ReactNode;
  /** Texte du bouton de validation */
  validateLabel?: string;
  onValidate: () => void;
  /** Si true, l'utilisateur peut fermer en cliquant a cote (re-ouverture).
   *  Si false (first-visit), il doit valider. */
  dismissable?: boolean;
  onDismiss?: () => void;
}

export default function IntroModal({
  visible,
  emoji,
  title,
  description,
  sections = [],
  children,
  validateLabel = "C'est parti",
  onValidate,
  dismissable = false,
  onDismiss,
}: IntroModalProps) {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss ?? (() => {})}
        dismissable={dismissable}
        contentContainerStyle={styles.modal}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text variant="headlineSmall" style={styles.title}>
            {title}
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            {description}
          </Text>

          {sections.length > 0 && (
            <View style={styles.sectionsBlock}>
              {sections.map((s, i) => (
                <View key={i} style={styles.section}>
                  {s.icon && <Text style={styles.sectionIcon}>{s.icon}</Text>}
                  <View style={{ flex: 1 }}>
                    {s.title && (
                      <Text variant="titleSmall" style={styles.sectionTitle}>
                        {s.title}
                      </Text>
                    )}
                    <Text variant="bodySmall" style={styles.sectionBody}>
                      {s.body}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {children}

          <Button
            mode="contained"
            onPress={onValidate}
            style={styles.validateBtn}
            contentStyle={{ paddingVertical: 6 }}
          >
            {validateLabel}
          </Button>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: spacing.lg,
    padding: spacing['2xl'],
    borderRadius: radius['2xl'],
    backgroundColor: colors.surface,
    maxHeight: '90%',
  },
  emoji: { fontSize: 44, textAlign: 'center', marginBottom: spacing.sm },
  title: {
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  sectionsBlock: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  section: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.lg,
  },
  sectionIcon: { fontSize: 22 },
  sectionTitle: { color: colors.text, marginBottom: 2 },
  sectionBody: { color: colors.textSecondary, lineHeight: 18 },
  validateBtn: { borderRadius: radius.md, marginTop: spacing.md },
});
