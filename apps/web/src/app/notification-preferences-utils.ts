export interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: string;
}

export interface NotificationPreference {
  channelId: string;
  enabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  notificationTypes: {
    crashes: boolean;
    alerts: boolean;
    reports: boolean;
    updates: boolean;
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  channel: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
}

export const DEFAULT_CHANNELS: NotificationChannel[] = [
  {
    id: 'in-app',
    name: 'In-App Notifications',
    description: 'Receive notifications within the dashboard',
    enabled: true,
    icon: '🔔',
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Receive notifications via email',
    enabled: true,
    icon: '📧',
  },
  {
    id: 'webhook',
    name: 'Webhook',
    description: 'Send notifications to a webhook endpoint',
    enabled: false,
    icon: '🔗',
  },
];

export const DEFAULT_CHANNEL_PREFERENCES: NotificationPreference[] = DEFAULT_CHANNELS.map(
  (channel) => ({
    channelId: channel.id,
    enabled: channel.enabled,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    notificationTypes: {
      crashes: true,
      alerts: true,
      reports: true,
      updates: channel.id === 'in-app',
    },
  })
);

export const saveChannelPreferences = (prefs: NotificationPreference[]): void => {
  try {
    localStorage.setItem(
      'notification-preferences',
      JSON.stringify(prefs)
    );
  } catch (e) {
    console.error('Failed to save notification preferences:', e);
  }
};

export const loadChannelPreferences = (): NotificationPreference[] => {
  try {
    const stored = localStorage.getItem('notification-preferences');
    return stored ? JSON.parse(stored) : DEFAULT_CHANNEL_PREFERENCES;
  } catch {
    return DEFAULT_CHANNEL_PREFERENCES;
  }
};

export const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Critical Crash Detected',
    message: 'Run #2847 detected a critical authorization failure',
    channel: 'in-app',
    severity: 'error',
    timestamp: new Date(Date.now() - 300000),
    read: false,
  },
  {
    id: '2',
    title: 'Campaign Milestone Reached',
    message: 'Contract fuzzing campaign has completed 1M mutations',
    channel: 'email',
    severity: 'success',
    timestamp: new Date(Date.now() - 600000),
    read: true,
  },
  {
    id: '3',
    title: 'Alert: High Resource Fee',
    message: 'Run #2846 exceeded resource fee threshold',
    channel: 'in-app',
    severity: 'warning',
    timestamp: new Date(Date.now() - 900000),
    read: true,
  },
];

/**
 * Global notification settings (as opposed to NotificationPreference above,
 * which is a per-channel toggle). Drives the /settings/notifications page
 * and the notification-center inbox filter.
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type DigestFrequency = 'realtime' | 'hourly' | 'daily' | 'never';

const PRIORITY_RANK: Record<NotificationPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export interface NotificationPreferences {
  enabledTypes: NotificationType[];
  minPriority: NotificationPriority;
  digestFrequency: DigestFrequency;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  emailNotifications: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabledTypes: ['info', 'success', 'warning', 'error'],
  minPriority: 'low',
  digestFrequency: 'realtime',
  soundEnabled: true,
  desktopNotifications: true,
  emailNotifications: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

const NOTIFICATION_SETTINGS_STORAGE_KEY = 'notification-global-preferences';

/** Validates a NotificationPreferences object. */
export const validatePreferences = (prefs: NotificationPreferences): string | null => {
  if (prefs.enabledTypes.length === 0) {
    return 'At least one notification type must be enabled.';
  }
  return null;
};

/** Determines whether a notification should be shown given the user's settings. */
export const filterByPreferences = (
  notification: { type: NotificationType; priority: NotificationPriority },
  prefs: NotificationPreferences,
): boolean => {
  if (!prefs.enabledTypes.includes(notification.type)) return false;
  return PRIORITY_RANK[notification.priority] >= PRIORITY_RANK[prefs.minPriority];
};

/** Returns true when `now` falls within the configured quiet-hours window. */
export const isInQuietHours = (prefs: NotificationPreferences, now: Date): boolean => {
  if (!prefs.quietHoursEnabled) return false;

  const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
  const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  // Window wraps past midnight (e.g. 22:00 - 08:00).
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
};

/** Toggles a notification type's membership in enabledTypes (won't empty the list). */
export const toggleType = (
  prefs: NotificationPreferences,
  type: NotificationType,
): NotificationPreferences => {
  const enabled = prefs.enabledTypes.includes(type);
  if (enabled && prefs.enabledTypes.length <= 1) return prefs;
  return {
    ...prefs,
    enabledTypes: enabled
      ? prefs.enabledTypes.filter((t) => t !== type)
      : [...prefs.enabledTypes, type],
  };
};

export const setMinPriority = (
  prefs: NotificationPreferences,
  priority: NotificationPriority,
): NotificationPreferences => ({ ...prefs, minPriority: priority });

export const setDigestFrequency = (
  prefs: NotificationPreferences,
  frequency: DigestFrequency,
): NotificationPreferences => ({ ...prefs, digestFrequency: frequency });

export const savePreferences = (prefs: NotificationPreferences): void => {
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save notification settings:', e);
  }
};

export const loadPreferences = (): NotificationPreferences => {
  try {
    const stored = localStorage.getItem(NOTIFICATION_SETTINGS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
};
