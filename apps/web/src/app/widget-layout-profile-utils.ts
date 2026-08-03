/**
 * Per-user-profile persistence helpers for the custom widget layout editor.
 */

export const WIDGET_LAYOUT_STORAGE_PREFIX = 'dashboard-widget-layout';
export const ACTIVE_WIDGET_LAYOUT_PROFILE_KEY = 'dashboard-widget-layout-active-profile';
export const DEFAULT_WIDGET_LAYOUT_PROFILE_ID = 'default';

export function normalizeProfileId(profileId: string | null | undefined): string {
  const trimmed = (profileId ?? '').trim();
  if (!trimmed) return DEFAULT_WIDGET_LAYOUT_PROFILE_ID;
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
}

export function getWidgetLayoutStorageKey(profileId?: string | null): string {
  return `${WIDGET_LAYOUT_STORAGE_PREFIX}:${normalizeProfileId(profileId)}`;
}

export function readActiveWidgetLayoutProfileId(
  storage: Pick<Storage, 'getItem'> = globalThis.localStorage,
): string {
  try {
    return normalizeProfileId(storage.getItem(ACTIVE_WIDGET_LAYOUT_PROFILE_KEY));
  } catch {
    return DEFAULT_WIDGET_LAYOUT_PROFILE_ID;
  }
}

export function writeActiveWidgetLayoutProfileId(
  profileId: string,
  storage: Pick<Storage, 'setItem'> = globalThis.localStorage,
): string {
  const normalized = normalizeProfileId(profileId);
  storage.setItem(ACTIVE_WIDGET_LAYOUT_PROFILE_KEY, normalized);
  return normalized;
}

export function loadWidgetLayoutForProfile<T>(
  profileId: string | null | undefined,
  fallback: T,
  storage: Pick<Storage, 'getItem'> = globalThis.localStorage,
): T {
  const key = getWidgetLayoutStorageKey(profileId);
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveWidgetLayoutForProfile<T>(
  profileId: string | null | undefined,
  layout: T,
  storage: Pick<Storage, 'setItem'> = globalThis.localStorage,
): string {
  const key = getWidgetLayoutStorageKey(profileId);
  storage.setItem(key, JSON.stringify(layout));
  return key;
}
