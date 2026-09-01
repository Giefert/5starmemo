import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';

const DAILY_REMINDER_CHANNEL_ID = 'daily-reminders';
const DAILY_REMINDER_TYPE = 'daily-app-reminder';

export const DEFAULT_DAILY_REMINDER_TIME = {
  hour: 12,
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

type StoredDailyReminderResult =
  | { kind: 'missing' }
  | { kind: 'invalid' }
  | { kind: 'valid'; settings: DailyReminderSettings };

const key = (userId: string, restaurantId: string) =>
  `dailyReminder.${restaurantId}.${userId}`;

const notificationIdentifier = (userId: string, restaurantId: string) =>
  `${DAILY_REMINDER_CHANNEL_ID}.${restaurantId}.${userId}`;

const inactiveSettings = (
  time: Pick<DailyReminderSettings, 'hour' | 'minute'> =
    DEFAULT_DAILY_REMINDER_TIME,
): DailyReminderSettings => ({
  enabled: false,
  hour: time.hour,
  minute: time.minute,
});

let reminderOperationQueue: Promise<void> = Promise.resolve();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const supportsDailyReminders = () =>
  Platform.OS === 'ios' || Platform.OS === 'android';

function enqueueReminderOperation<T>(operation: () => Promise<T>): Promise<T> {
  const task = reminderOperationQueue.then(operation, operation);
  reminderOperationQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

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

export function initializeDailyReminderSettings(
  userId: string,
  restaurantId: string,
): Promise<DailyReminderSettings> {
  return enqueueReminderOperation(() =>
    performDailyReminderInitialization(userId, restaurantId),
  );
}

export function saveDailyReminderSettings(
  userId: string,
  restaurantId: string,
  input: Pick<DailyReminderSettings, 'enabled' | 'hour' | 'minute'>,
): Promise<SaveDailyReminderResult> {
  return enqueueReminderOperation(() =>
    performSaveDailyReminderSettings(userId, restaurantId, input),
  );
}

export function clearDailyReminderSchedule(): Promise<void> {
  return enqueueReminderOperation(() => cancelTaggedDailyReminders());
}

export function deleteDailyReminderSettings(
  userId: string,
  restaurantId: string,
): Promise<void> {
  return enqueueReminderOperation(async () => {
    await SecureStore.deleteItemAsync(key(userId, restaurantId));
    await cancelTaggedDailyReminders();
  });
}

async function performDailyReminderInitialization(
  userId: string,
  restaurantId: string,
): Promise<DailyReminderSettings> {
  const stored = await readStoredDailyReminderSettings(userId, restaurantId);

  // Automatic-On means the first authenticated use with no saved preference.
  // An invalid record fails closed instead of being treated as a first use.
  if (stored.kind === 'missing') {
    try {
      const result = await activateDailyReminder(
        userId,
        restaurantId,
        DEFAULT_DAILY_REMINDER_TIME,
        true,
      );
      return result.settings;
    } catch (error) {
      console.warn('Failed to initialize daily reminder:', error);
      return setDailyReminderInactive(
        userId,
        restaurantId,
        DEFAULT_DAILY_REMINDER_TIME,
      );
    }
  }

  if (stored.kind === 'invalid') {
    return setDailyReminderInactive(
      userId,
      restaurantId,
      DEFAULT_DAILY_REMINDER_TIME,
    );
  }

  if (!stored.settings.enabled) {
    return setDailyReminderInactive(userId, restaurantId, stored.settings);
  }

  try {
    const result = await activateDailyReminder(
      userId,
      restaurantId,
      stored.settings,
      false,
    );
    return result.settings;
  } catch (error) {
    console.warn('Failed to reconcile daily reminder:', error);
    return setDailyReminderInactive(userId, restaurantId, stored.settings);
  }
}

async function performSaveDailyReminderSettings(
  userId: string,
  restaurantId: string,
  input: Pick<DailyReminderSettings, 'enabled' | 'hour' | 'minute'>,
): Promise<SaveDailyReminderResult> {
  if (!input.enabled) {
    const settings = await setDailyReminderInactive(userId, restaurantId, input);
    return { settings, permissionGranted: true };
  }

  try {
    return await activateDailyReminder(userId, restaurantId, input, true);
  } catch (error) {
    try {
      await setDailyReminderInactive(userId, restaurantId, input);
    } catch (cleanupError) {
      console.warn('Failed to leave daily reminder inactive:', cleanupError);
    }
    throw error;
  }
}

async function activateDailyReminder(
  userId: string,
  restaurantId: string,
  time: Pick<DailyReminderSettings, 'hour' | 'minute'>,
  requestPermission: boolean,
): Promise<SaveDailyReminderResult> {
  if (!supportsDailyReminders()) {
    const settings = await setDailyReminderInactive(userId, restaurantId, time);
    return { settings, permissionGranted: false };
  }

  const channelAvailable = await ensureAndroidChannel();
  const permissionGranted =
    channelAvailable && (await ensureNotificationPermission(requestPermission));
  if (!permissionGranted) {
    const settings = await setDailyReminderInactive(userId, restaurantId, time);
    return { settings, permissionGranted: false };
  }

  const notificationId = notificationIdentifier(userId, restaurantId);
  const settings: DailyReminderSettings = {
    enabled: true,
    hour: time.hour,
    minute: time.minute,
    notificationId,
  };

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: 'Tusavor',
        body: 'Take a quick moment in the app today.',
        data: {
          reminderType: DAILY_REMINDER_TYPE,
          reminderKey: key(userId, restaurantId),
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
        channelId: DAILY_REMINDER_CHANNEL_ID,
      },
    });
    await persistSettings(userId, restaurantId, settings);
  } catch (error) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (cleanupError) {
      console.warn('Failed to remove an incomplete daily reminder:', cleanupError);
    }
    throw error;
  }

  // Preferences are account-scoped, but the current authenticated account is
  // the only owner of a device reminder. Legacy and prior-account schedules are
  // removed after the deterministic current schedule is safely installed.
  try {
    await cancelTaggedDailyReminders(notificationId);
  } catch (error) {
    console.warn('Failed to clean up older daily reminders:', error);
  }

  return { settings, permissionGranted: true };
}

async function setDailyReminderInactive(
  userId: string,
  restaurantId: string,
  time: Pick<DailyReminderSettings, 'hour' | 'minute'>,
): Promise<DailyReminderSettings> {
  const settings = inactiveSettings(time);
  await persistSettings(userId, restaurantId, settings);
  await cancelTaggedDailyReminders();
  return settings;
}

async function readStoredDailyReminderSettings(
  userId: string,
  restaurantId: string,
): Promise<StoredDailyReminderResult> {
  const raw = await SecureStore.getItemAsync(key(userId, restaurantId));
  if (raw === null) return { kind: 'missing' };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.enabled !== 'boolean') {
      return { kind: 'invalid' };
    }

    const settings: DailyReminderSettings = {
      enabled: parsed.enabled,
      hour: normalizeHour(parsed.hour),
      minute: normalizeMinute(parsed.minute),
    };
    if (parsed.enabled && typeof parsed.notificationId === 'string') {
      settings.notificationId = parsed.notificationId;
    }
    return { kind: 'valid', settings };
  } catch {
    return { kind: 'invalid' };
  }
}

async function persistSettings(
  userId: string,
  restaurantId: string,
  settings: DailyReminderSettings,
) {
  await SecureStore.setItemAsync(key(userId, restaurantId), JSON.stringify(settings));
}

async function cancelTaggedDailyReminders(keepNotificationId?: string) {
  if (!supportsDailyReminders()) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const reminders = scheduled.filter(
    (request) =>
      request.content.data?.reminderType === DAILY_REMINDER_TYPE &&
      request.identifier !== keepNotificationId,
  );
  const results = await Promise.allSettled(
    reminders.map((request) =>
      Notifications.cancelScheduledNotificationAsync(request.identifier),
    ),
  );
  const failures = results.filter((result) => result.status === 'rejected');
  if (failures.length > 0) {
    throw new Error(`Failed to cancel ${failures.length} daily reminder(s).`);
  }
}

function hasUsableNotificationPermission(
  permission: Notifications.NotificationPermissionsStatus,
): boolean {
  if (Platform.OS === 'ios' && permission.ios) {
    return [
      Notifications.IosAuthorizationStatus.AUTHORIZED,
      Notifications.IosAuthorizationStatus.PROVISIONAL,
      Notifications.IosAuthorizationStatus.EPHEMERAL,
    ].includes(permission.ios.status);
  }

  return permission.status === Notifications.PermissionStatus.GRANTED;
}

async function ensureNotificationPermission(requestIfNeeded: boolean): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (hasUsableNotificationPermission(existing)) return true;
  if (!requestIfNeeded || !existing.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync();
  return hasUsableNotificationPermission(requested);
}

async function ensureAndroidChannel(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const channel = await Notifications.setNotificationChannelAsync(
    DAILY_REMINDER_CHANNEL_ID,
    {
      name: 'Daily reminders',
      description: 'A daily reminder to open Tusavor.',
      importance: Notifications.AndroidImportance.DEFAULT,
    },
  );

  const androidApiLevel = Number(Platform.Version);
  if (Number.isFinite(androidApiLevel) && androidApiLevel < 26) return true;
  return channel !== null && channel.importance !== Notifications.AndroidImportance.NONE;
}
