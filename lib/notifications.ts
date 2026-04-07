import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuration du comportement des notifications au premier plan
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Demande la permission de notifications a l'utilisateur
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return false;

  // Android : creer le channel de notifications
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rappels', {
      name: 'Rappels',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return true;
}

/**
 * Programme les rappels quotidiens (notifications locales)
 */
export async function scheduleLocalReminders() {
  // Annuler les rappels existants avant de reprogrammer
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Rappel 12h30 — dejeuner
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Vekio',
      body: "Tu n'as pas encore logué ton déjeuner ! 🍽️",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 12,
      minute: 30,
      channelId: Platform.OS === 'android' ? 'rappels' : undefined,
    },
  });

  // Rappel 20h00 — diner
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Vekio',
      body: "N'oublie pas de loguer ton dîner ! 🌙",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
      channelId: Platform.OS === 'android' ? 'rappels' : undefined,
    },
  });
}

/**
 * Annule tous les rappels (quand l'utilisateur desactive dans les parametres)
 */
export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
