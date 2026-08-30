/**
 * Coalesces concurrent GET requests to the same URL into a single network
 * call. Several routes (dashboard, runs list, trends, triage, analytics)
 * independently fetch `/api/runs` on mount, which previously produced
 * duplicate in-flight requests whenever more than one of them rendered at
 * the same time. Callers awaiting the same URL while a request is already
 * in flight share that request's parsed JSON result instead of issuing a
 * new fetch.
 *
 * Entries also survive a brief grace window past settlement (#1409) so that
 * a remount burst — unmount and immediately remount, which React does in
 * StrictMode and on fast route changes — reuses the outcome instead of
 * refetching. The window is bounded and self-evicting: the map is never a
 * long-lived cache.
 *
 * COMPOSITION NOTE (#1409). Two sibling changes are expected in this file
 * (abort-signal, timeout-retry). The regions are disjoint:
 *   - signal construction: the `AbortSignal.timeout` / `AbortSignal.any` pair
 *     inside `dedupedFetchJson`  — the abort-signal work owns this
 *   - fetch and response parsing: the `.then` body — timeout-retry owns this
 *   - entry lifecycle: `SETTLED_GRACE_MS`, `DedupeEntry`, `forget`,
 *     `scheduleEviction` and the settlement handlers — THIS change owns these
 * This change adds only the third region plus the four lines in
 * `dedupedFetchJson` that register and settle the entry. It reads nothing from
 * the signal or the response body, so it rebases cleanly onto either sibling
 * in any landing order.
 */

/**
 * How long a settled entry stays available before eviction.
 *
 * 30s comfortably covers a remount burst (StrictMode double-invoke, route
 * bounce, tab refocus) which resolves in well under a second. Going longer
 * starts to read as a cache: a user who edits a filter, reverts it, and sees
 * minute-old numbers has no way to tell the data is stale, and this module
 * has no revalidation story. Shorter than a few seconds would miss the
 * remount bursts this exists for.
 */
export const SETTLED_GRACE_MS = 30_000;

interface DedupeEntry {
  /** The shared promise handed to every caller for this URL. */
  readonly promise: Promise<unknown>;
  /** Eviction timer, present only once the request has settled. */
  timer?: ReturnType<typeof setTimeout>;
}

const inFlightRequests = new Map<string, DedupeEntry>();

/**
 * Thrown when a deduped request completes with a non-ok status. Callers that
 * branch on the status code (for example `fetchRun`, which maps 404 to `null`)
 * need it structurally rather than having to parse the message.
 */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

import { API_FETCH_TIMEOUT_MS } from './timeouts';

/**
 * Drops an entry and cancels any eviction timer still pointing at it, so a
 * removed key can never be evicted twice or hold a timer alive.
 */
function forget(url: string): void {
  const entry = inFlightRequests.get(url);
  if (!entry) return;
  if (entry.timer !== undefined) clearTimeout(entry.timer);
  inFlightRequests.delete(url);
}

/**
 * Schedules eviction of a settled entry.
 *
 * The timer is `unref`'d where the runtime supports it (Node, and therefore
 * Vitest) so a pending eviction can never hold the process open at the end of
 * a test run. Browsers have no `unref`; the feature check covers both.
 *
 * The window runs from settlement and is never extended by a cache hit —
 * extending it would let a hot key live forever, which is the retention this
 * module is specifically avoiding.
 */
function scheduleEviction(url: string, entry: DedupeEntry): void {
  const timer = setTimeout(() => {
    // Only evict if this exact entry is still the one on file. A later request
    // for the same URL replaces the entry, and its own timer owns eviction.
    if (inFlightRequests.get(url) === entry) inFlightRequests.delete(url);
  }, SETTLED_GRACE_MS);

  if (typeof (timer as { unref?: () => void }).unref === 'function') {
    (timer as unknown as { unref: () => void }).unref();
  }

  entry.timer = timer;
}

export function dedupedFetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const existing = inFlightRequests.get(url);
  if (existing) return existing.promise as Promise<T>;

  const timeoutSignal = AbortSignal.timeout(API_FETCH_TIMEOUT_MS);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  const request = fetch(url, { signal: combinedSignal }).then(async (res) => {
    if (!res.ok) throw new HttpError(res.status);
    const json = (await res.json()) as unknown;
    if (json && typeof json === 'object' && 'data' in json) {
      const envelope = json as { data: unknown; total?: number };
      if (
        envelope.data &&
        typeof envelope.data === 'object' &&
        !Array.isArray(envelope.data) &&
        envelope.total !== undefined &&
        !('total' in (envelope.data as object))
      ) {
        return { ...(envelope.data as object), total: envelope.total } as T;
      }
      return envelope.data as T;
    }
    return json as T;
  });

  const entry: DedupeEntry = { promise: request };
  inFlightRequests.set(url, entry);

  request.then(
    () => {
      // Success: hold the outcome for the grace window, then evict.
      if (inFlightRequests.get(url) === entry) scheduleEviction(url, entry);
    },
    () => {
      // Failure: evict immediately. A grace window on rejections would make a
      // transient blip sticky for 30s and break retry-after-failure, so
      // failures keep the original evict-on-settle behaviour.
      if (inFlightRequests.get(url) === entry) forget(url);
    },
  );

  return request;
}

/**
 * Number of entries currently held, in-flight and within-grace combined.
 *
 * Test-only observability for the eviction assertions — `dedupedFetchJson`'s
 * signature and behaviour are unchanged by its presence. Not used in app code.
 */
export function __dedupeEntryCount(): number {
  return inFlightRequests.size;
}
