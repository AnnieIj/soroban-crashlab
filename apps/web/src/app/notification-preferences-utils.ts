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
  priority?: NotificationPriority;
  digestFrequency?: DigestFrequency;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  channel?: string;
  severity?: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
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

export const DEFAULT_PREFERENCES: NotificationPreference[] = DEFAULT_CHANNELS.map(
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

export const savePreferences = (prefs: NotificationPreference[]): void => {
  try {
    localStorage.setItem(
      'notification-preferences',
      JSON.stringify(prefs)
    );
  } catch (e) {
    console.error('Failed to save notification preferences:', e);
  }
};

export const loadPreferences = (): NotificationPreference[] => {
  try {
    const stored = localStorage.getItem('notification-preferences');
    return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'crashes' | 'alerts' | 'reports' | 'updates';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type DigestFrequency = 'never' | 'daily' | 'weekly';

export const validatePreferences = (prefs: NotificationPreference[]): NotificationPreference[] => {
  return prefs.map((pref) => ({
    ...pref,
    notificationTypes: {
      crashes: pref.notificationTypes?.crashes ?? true,
      alerts: pref.notificationTypes?.alerts ?? true,
      reports: pref.notificationTypes?.reports ?? true,
      updates: pref.notificationTypes?.updates ?? true,
    },
  }));
};

export const toggleType = (prefs: NotificationPreference[], channelId: string, type: NotificationType): NotificationPreference[] => {
  const normalizedType = type === 'crashes' || type === 'alerts' || type === 'reports' || type === 'updates'
    ? type
    : 'updates';

  return prefs.map((pref) => pref.channelId === channelId
    ? {
        ...pref,
        notificationTypes: {
          ...pref.notificationTypes,
          [normalizedType]: !pref.notificationTypes[normalizedType],
        },
      }
    : pref);
};

export const setMinPriority = (prefs: NotificationPreference[], priority: NotificationPriority): NotificationPreference[] => {
  return prefs.map((pref) => ({ ...pref, priority: priority as never }));
};

export const setDigestFrequency = (prefs: NotificationPreference[], frequency: DigestFrequency): NotificationPreference[] => {
  return prefs.map((pref) => ({ ...pref, digestFrequency: frequency }));
};

export const filterByPreferences = (notification: Notification, prefs: NotificationPreference[]): boolean => {
  const channel = notification.channel ?? 'in-app';
  const pref = prefs.find((entry) => entry.channelId === channel);
  if (!pref) {
    return false;
  }

  const severity = notification.severity ?? notification.type ?? 'info';
  const notificationType = severity === 'error' || severity === 'warning' ? 'alerts' : 'updates';
  return pref.enabled && pref.notificationTypes[notificationType as keyof NotificationPreference['notificationTypes']] !== false;
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
