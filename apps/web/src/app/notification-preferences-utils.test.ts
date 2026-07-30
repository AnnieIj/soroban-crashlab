import {
  DEFAULT_CHANNELS,
  DEFAULT_CHANNEL_PREFERENCES,
  mockNotifications,
  filterByPreferences,
  toggleType,
  validatePreferences,
} from './notification-preferences-utils';

console.assert(DEFAULT_CHANNELS.length === 3, 'Should have 3 default channels');
console.assert(DEFAULT_CHANNEL_PREFERENCES.length === 3, 'Should have 3 default preferences');
console.assert(mockNotifications.length === 3, 'Should have 3 mock notifications');
console.assert(DEFAULT_CHANNELS[0].id === 'in-app', 'First channel should be in-app');
console.assert(
  mockNotifications.some(n => n.severity === 'error'),
  'Should have error severity notification'
);
console.assert(filterByPreferences({ type: 'info', priority: 'low' }, DEFAULT_PREFERENCES) === true);
console.assert(toggleType(DEFAULT_PREFERENCES, 'info').enabledTypes.includes('info') === false);
console.assert(validatePreferences(DEFAULT_PREFERENCES) === null);
console.log('✓ Notification preferences utilities tests passed');
