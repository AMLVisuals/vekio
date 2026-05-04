// =============================================================================
// IntroModal — pop-up d'introduction reutilisable par onglet
// =============================================================================
// Tout le contenu doit etre visible sans scroll. Le modal s'agrandit pour
// occuper la place necessaire (jusqu'a 95% de l'ecran).

import { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Portal, Modal, Button } from 'react-native-paper';
import { colors, spacing, radius, shadow } from '../theme/tokens';

export interface IntroSection {
  icon?: string;
  title?: string;
  body: string;
}

interface IntroModalProps {
  visible: boolean;
  emoji: string;
  title: string;
  description: string;
  sections?: IntroSection[];
  children?: ReactNode;
  validateLabel?: string;
  onValidate: () => void;
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
          contentStyle={{ paddingVertical: 4 }}
        >
          {validateLabel}
        </Button>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    borderRadius: radius['2xl'],
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadow.modal,
  },
  emoji: { fontSize: 36, textAlign: 'center', marginBottom: spacing.xs },
  title: {
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.lg,
    fontSize: 13,
  },
  sectionsBlock: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  section: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
  sectionIcon: { fontSize: 18, marginTop: 1 },
  sectionTitle: {
    color: colors.text,
    marginBottom: 1,
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  sectionBody: {
    color: colors.textSecondary,
    lineHeight: 16,
    fontSize: 12,
  },
  validateBtn: { borderRadius: radius.md, marginTop: spacing.xs },
});
