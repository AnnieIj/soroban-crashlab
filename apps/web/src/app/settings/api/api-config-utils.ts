export const STORAGE_KEY = 'crashlab:api-config';

/**
 * Separate key for the *unsaved* draft. Kept apart from {@link STORAGE_KEY} so a
 * half-typed backend URL is never treated as the live configuration.
 */
export const DRAFT_STORAGE_KEY = 'crashlab:api-config:draft';

export interface ApiConfig {
  backendUrl: string;
  rateLimitMaxRequests: number;
  rateLimitWindowSeconds: number;
}

export interface ValidationErrors {
  backendUrl?: string;
  rateLimitMaxRequests?: string;
  rateLimitWindowSeconds?: string;
}

export const DEFAULT_CONFIG: ApiConfig = {
  backendUrl: '',
  rateLimitMaxRequests: 100,
  rateLimitWindowSeconds: 60,
};

export function loadFromStorage(storage?: typeof window.localStorage): ApiConfig {
  const store = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return DEFAULT_CONFIG;

  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ApiConfig>;
    return {
      backendUrl: typeof parsed.backendUrl === 'string' ? parsed.backendUrl : DEFAULT_CONFIG.backendUrl,
      rateLimitMaxRequests:
        typeof parsed.rateLimitMaxRequests === 'number' && parsed.rateLimitMaxRequests >= 1
          ? parsed.rateLimitMaxRequests
          : DEFAULT_CONFIG.rateLimitMaxRequests,
      rateLimitWindowSeconds:
        typeof parsed.rateLimitWindowSeconds === 'number' && parsed.rateLimitWindowSeconds >= 1
          ? parsed.rateLimitWindowSeconds
          : DEFAULT_CONFIG.rateLimitWindowSeconds,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function validateConfig(config: ApiConfig): ValidationErrors {
  const errors: ValidationErrors = {};

  if (config.backendUrl.trim() !== '') {
    try {
      const url = new URL(config.backendUrl.trim());
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.backendUrl = 'URL must start with http:// or https://';
      }
    } catch {
      errors.backendUrl = 'Enter a valid URL (e.g. https://api.example.com)';
    }
  }

  if (!Number.isInteger(config.rateLimitMaxRequests) || config.rateLimitMaxRequests < 1) {
    errors.rateLimitMaxRequests = 'Must be a whole number of at least 1';
  }

  if (!Number.isInteger(config.rateLimitWindowSeconds) || config.rateLimitWindowSeconds < 1) {
    errors.rateLimitWindowSeconds = 'Must be a whole number of at least 1';
  }

  return errors;
}

export function saveToStorage(config: ApiConfig, storage?: typeof window.localStorage): boolean {
  const store = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return false;

  try {
    store.setItem(STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
}

export function resetStorage(storage?: typeof window.localStorage): void {
  const store = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (store) {
    store.removeItem(STORAGE_KEY);
  }
}

// ── Unsaved draft persistence (#1074) ────────────────────────────────────────
//
// The form only held pending edits in React state, so a backgrounded tab that
// the browser discarded (common on mobile Safari/Chrome) remounted the form from
// the last *saved* config and silently threw the edits away. Mirroring every
// keystroke into a draft entry lets the form rehydrate exactly what was typed.

function resolveStorage(storage?: typeof window.localStorage) {
  return storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
}

export function saveDraft(config: ApiConfig, storage?: typeof window.localStorage): boolean {
  const store = resolveStorage(storage);
  if (!store) return false;

  try {
    store.setItem(DRAFT_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch {
    // Storage may be full or blocked (private mode); persistence is best-effort.
    return false;
  }
}

/**
 * Read back a draft, or `null` when there isn't a usable one.
 *
 * Unlike {@link loadFromStorage} this deliberately does **not** substitute
 * defaults for out-of-range numbers: a draft represents work in progress, so a
 * half-typed `0` must survive the round trip and re-trigger its validation
 * message rather than silently snapping back to 100. Only genuinely wrong
 * *types* fall back, so a corrupt entry can never break the form.
 */
export function loadDraft(storage?: typeof window.localStorage): ApiConfig | null {
  const store = resolveStorage(storage);
  if (!store) return null;

  try {
    const raw = store.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ApiConfig> | null;
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      backendUrl: typeof parsed.backendUrl === 'string' ? parsed.backendUrl : DEFAULT_CONFIG.backendUrl,
      rateLimitMaxRequests:
        typeof parsed.rateLimitMaxRequests === 'number' && Number.isFinite(parsed.rateLimitMaxRequests)
          ? parsed.rateLimitMaxRequests
          : DEFAULT_CONFIG.rateLimitMaxRequests,
      rateLimitWindowSeconds:
        typeof parsed.rateLimitWindowSeconds === 'number' && Number.isFinite(parsed.rateLimitWindowSeconds)
          ? parsed.rateLimitWindowSeconds
          : DEFAULT_CONFIG.rateLimitWindowSeconds,
    };
  } catch {
    return null;
  }
}

export function clearDraft(storage?: typeof window.localStorage): void {
  const store = resolveStorage(storage);
  if (store) {
    try {
      store.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore — nothing we can do if storage is unavailable
    }
  }
}

/** Whether two configs hold the same values (used to skip no-op draft writes). */
export function isSameConfig(a: ApiConfig, b: ApiConfig): boolean {
  return (
    a.backendUrl === b.backendUrl &&
    a.rateLimitMaxRequests === b.rateLimitMaxRequests &&
    a.rateLimitWindowSeconds === b.rateLimitWindowSeconds
  );
}

/**
 * Pick the state the form should mount with: the draft when one exists and
 * actually differs from what was saved, otherwise the saved config.
 */
export function resolveInitialConfig(saved: ApiConfig, draft: ApiConfig | null): ApiConfig {
  if (!draft || isSameConfig(saved, draft)) return saved;
  return draft;
}
