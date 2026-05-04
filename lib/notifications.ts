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

const DAILY_MEAL_KIND = 'daily_meal';

async function cancelExistingDailyMeals() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if ((n.content.data as { kind?: string } | undefined)?.kind === DAILY_MEAL_KIND) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/**
 * Programme les rappels quotidiens (notifications locales)
 */
export async function scheduleLocalReminders() {
  // Annule uniquement les rappels repas existants (preserve la pesee hebdo).
  await cancelExistingDailyMeals();

  // Rappel 12h30 — dejeuner
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Vekio',
      body: "Tu n'as pas encore logué ton déjeuner ! 🍽️",
      data: { kind: DAILY_MEAL_KIND },
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
      data: { kind: DAILY_MEAL_KIND },
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

// =============================================================================
// Pesee hebdomadaire — notification recurrente independante des rappels repas
// =============================================================================
//   - jour : 0 = dimanche, 1 = lundi, ... 6 = samedi (convention Vekio)
//   - heure : "HH:MM" en 24h
//
// On utilise un marker dans content.data pour pouvoir annuler/reprogrammer
// uniquement cette notification sans toucher aux rappels repas.

const WEIGH_IN_KIND = 'weekly_weigh_in';

async function cancelExistingWeighIn() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if ((n.content.data as { kind?: string } | undefined)?.kind === WEIGH_IN_KIND) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

export async function scheduleWeeklyWeighIn(jour: number, heureStr: string): Promise<void> {
  await cancelExistingWeighIn();

  const [hh, mm] = heureStr.split(':').map(Number);
  if (isNaN(hh) || isNaN(mm)) return;

  // expo-notifications WEEKLY trigger : weekday 1 = dimanche, 2 = lundi, ...
  // notre convention : 0 = dimanche, 1 = lundi, donc +1.
  const weekday = jour + 1;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Pesée hebdomadaire',
      body: 'C\'est l\'heure de te peser ! ⚖️',
      data: { kind: WEIGH_IN_KIND },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour: hh,
      minute: mm,
      channelId: Platform.OS === 'android' ? 'rappels' : undefined,
    },
  });
}

export async function cancelWeeklyWeighIn(): Promise<void> {
  await cancelExistingWeighIn();
}
