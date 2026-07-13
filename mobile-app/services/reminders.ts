import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';

const DAILY_REMINDER_CHANNEL_ID = 'daily-reminders';

export const DEFAULT_DAILY_REMINDER_TIME = {
  hour: 17,
  minute: 0,
};

export interface DailyReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  notificationId?: string;
}

export interface SaveDailyReminderResult {
  settings: DailyReminderSettings;
  permissionGranted: boolean;
}

const key = (userId: string, restaurantId: string) =>
  `dailyReminder.${restaurantId}.${userId}`;

const defaultSettings = (): DailyReminderSettings => ({
  enabled: false,
  ...DEFAULT_DAILY_REMINDER_TIME,
});

function normalizeHour(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 23
    ? Number(value)
    : DEFAULT_DAILY_REMINDER_TIME.hour;
}

function normalizeMinute(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 59
    ? Number(value)
    : DEFAULT_DAILY_REMINDER_TIME.minute;
}

export function formatDailyReminderTime(
  hour: number,
  minute: number,
  uses24HourClock: boolean = false,
): string {
  if (uses24HourClock) {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${suffix}`;
}

export async function loadDailyReminderSettings(
  userId: string,
  restaurantId: string,
): Promise<DailyReminderSettings> {
  try {
    const raw = await SecureStore.getItemAsync(key(userId, restaurantId));
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed.enabled),
      hour: normalizeHour(parsed.hour),
      minute: normalizeMinute(parsed.minute),
      notificationId:
        typeof parsed.notificationId === 'string' ? parsed.notificationId : undefined,
    };
  } catch {
    return defaultSettings();
  }
}

export async function saveDailyReminderSettings(
  userId: string,
  restaurantId: string,
  input: Pick<DailyReminderSettings, 'enabled' | 'hour' | 'minute'>,
): Promise<SaveDailyReminderResult> {
  const previous = await loadDailyReminderSettings(userId, restaurantId);

  if (!input.enabled) {
    await cancelReminder(previous.notificationId);
    const settings: DailyReminderSettings = {
      enabled: false,
      hour: input.hour,
      minute: input.minute,
    };
    await persistSettings(userId, restaurantId, settings);
    return { settings, permissionGranted: true };
  }

  await ensureAndroidChannel();

  const permissionGranted = await ensureNotificationPermission();
  if (!permissionGranted) {
    return { settings: previous, permissionGranted: false };
  }

  await cancelReminder(previous.notificationId);

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tusavor',
      body: 'Take a quick moment in the app today.',
      data: { reminderType: 'daily-app-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: input.hour,
      minute: input.minute,
      channelId: DAILY_REMINDER_CHANNEL_ID,
    },
  });

  const settings: DailyReminderSettings = {
    enabled: true,
    hour: input.hour,
    minute: input.minute,
    notificationId,
  };
  await persistSettings(userId, restaurantId, settings);
  return { settings, permissionGranted: true };
}

async function persistSettings(
  userId: string,
  restaurantId: string,
  settings: DailyReminderSettings,
) {
  await SecureStore.setItemAsync(key(userId, restaurantId), JSON.stringify(settings));
}

async function cancelReminder(notificationId?: string) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('Failed to cancel daily reminder:', error);
  }
}

async function ensureNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(DAILY_REMINDER_CHANNEL_ID, {
    name: 'Daily reminders',
    description: 'A daily reminder to open Tusavor.',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}
