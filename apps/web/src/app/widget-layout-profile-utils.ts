export interface WidgetLayoutProfile {
  id: string;
  label: string;
}

export const WIDGET_LAYOUT_PROFILES: WidgetLayoutProfile[] = [
  { id: "default", label: "Default" },
  { id: "engineering", label: "Engineering" },
  { id: "on-call", label: "On-Call" },
];

export const DEFAULT_WIDGET_LAYOUT_PROFILE_ID = "default";

export const ACTIVE_WIDGET_LAYOUT_PROFILE_STORAGE_KEY =
  "dashboard-widget-layout-active-profile";

export function isKnownProfileId(
  profileId: string | null | undefined,
): boolean {
  if (!profileId) return false;
  return WIDGET_LAYOUT_PROFILES.some((p) => p.id === profileId);
}

export function resolveProfileId(profileId: string | null | undefined): string {
  return isKnownProfileId(profileId)
    ? (profileId as string)
    : DEFAULT_WIDGET_LAYOUT_PROFILE_ID;
}

export function getWidgetLayoutStorageKey(
  profileId: string | null | undefined,
): string {
  return `dashboard-widget-layout:${resolveProfileId(profileId)}`;
}
