/**
 * Coalesces concurrent GET requests to the same URL into a single network
 * call. Several routes (dashboard, runs list, trends, triage, analytics)
 * independently fetch `/api/runs` on mount, which previously produced
 * duplicate in-flight requests whenever more than one of them rendered at
 * the same time. Callers awaiting the same URL while a request is already
 * in flight share that request's parsed JSON result instead of issuing a
 * new fetch.
 */

const inFlightRequests = new Map<string, Promise<unknown>>();
const DEFAULT_TIMEOUT_MS = 10_000;

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

export function dedupedFetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const existing = inFlightRequests.get(url);
  if (existing) return existing as Promise<T>;

  const timeoutSignal = AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  const request = fetch(url, { signal: combinedSignal })
    .then((res) => {
      if (!res.ok) throw new HttpError(res.status);
      return res.json() as Promise<T>;
    })
    .finally(() => {
      inFlightRequests.delete(url);
    });

  inFlightRequests.set(url, request);
  return request;
}
