import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type DedupModule = typeof import('./request-dedup');

/**
 * `request-dedup` keeps its in-flight map in module scope, so every test gets a
 * freshly evaluated copy. Without this a leaked in-flight entry from one test
 * would be handed to the next one and make the suite order-dependent.
 */
async function loadModule(): Promise<DedupModule> {
  vi.resetModules();
  return import('./request-dedup');
}

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** The `AbortSignal` handed to `fetch` on the Nth call. */
function signalOfCall(fetchMock: ReturnType<typeof vi.fn>, call = 0): AbortSignal {
  return (fetchMock.mock.calls[call][1] as RequestInit).signal as AbortSignal;
}

describe('dedupedFetchJson', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('happy path', () => {
    it('resolves with the parsed JSON body', async () => {
      const { dedupedFetchJson } = await loadModule();
      fetchMock.mockResolvedValue(jsonResponse({ runs: [{ id: 'r1' }], total: 1 }));

      await expect(dedupedFetchJson('/api/runs')).resolves.toEqual({
        runs: [{ id: 'r1' }],
        total: 1,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe('/api/runs');
    });

    it('always passes an abort signal to fetch, even with no caller signal', async () => {
      const { dedupedFetchJson } = await loadModule();
      fetchMock.mockResolvedValue(jsonResponse({}));

      await dedupedFetchJson('/api/runs');

      const signal = signalOfCall(fetchMock);
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal.aborted).toBe(false);
    });

    it('preserves falsy and empty JSON payloads', async () => {
      const { dedupedFetchJson } = await loadModule();
      fetchMock.mockResolvedValue(jsonResponse(null));

      await expect(dedupedFetchJson('/api/runs')).resolves.toBeNull();
    });
  });

  describe('deduplication', () => {
    it('coalesces concurrent calls for the same URL into one fetch', async () => {
      const { dedupedFetchJson } = await loadModule();
      const gate = deferred<Response>();
      fetchMock.mockReturnValue(gate.promise);

      const first = dedupedFetchJson('/api/runs');
      const second = dedupedFetchJson('/api/runs');
      const third = dedupedFetchJson('/api/runs');

      gate.resolve(jsonResponse({ total: 7 }));

      expect(await first).toEqual({ total: 7 });
      expect(await second).toEqual({ total: 7 });
      expect(await third).toEqual({ total: 7 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('hands later callers the identical promise instance', async () => {
      const { dedupedFetchJson } = await loadModule();
      const gate = deferred<Response>();
      fetchMock.mockReturnValue(gate.promise);

      const first = dedupedFetchJson('/api/runs');
      const second = dedupedFetchJson('/api/runs');
      expect(second).toBe(first);

      gate.resolve(jsonResponse({}));
      await first;
    });

    it('does not coalesce different URLs', async () => {
      const { dedupedFetchJson } = await loadModule();
      fetchMock.mockImplementation((url: string) => Promise.resolve(jsonResponse({ url })));

      const [runs, trends] = await Promise.all([
        dedupedFetchJson('/api/runs'),
        dedupedFetchJson('/api/runs/trends'),
      ]);

      expect(runs).toEqual({ url: '/api/runs' });
      expect(trends).toEqual({ url: '/api/runs/trends' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('treats URLs differing only by query string as distinct', async () => {
      const { dedupedFetchJson } = await loadModule();
      fetchMock.mockResolvedValue(jsonResponse({}));

      await Promise.all([
        dedupedFetchJson('/api/runs?page=1'),
        dedupedFetchJson('/api/runs?page=2'),
      ]);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('is a coalescer, not a cache: a settled request is refetched', async () => {
      const { dedupedFetchJson } = await loadModule();
      fetchMock.mockResolvedValue(jsonResponse({ total: 1 }));

      await dedupedFetchJson('/api/runs');
      await dedupedFetchJson('/api/runs');

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('shares a rejection with every concurrent caller', async () => {
      const { dedupedFetchJson } = await loadModule();
      const gate = deferred<Response>();
      fetchMock.mockReturnValue(gate.promise);

      const first = dedupedFetchJson('/api/runs');
      const second = dedupedFetchJson('/api/runs');
      const boom = new Error('network down');
      gate.reject(boom);

      await expect(first).rejects.toBe(boom);
      await expect(second).rejects.toBe(boom);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it.each([
      [400, 'HTTP 400'],
      [404, 'HTTP 404'],
      [500, 'HTTP 500'],
    ])('rejects on a %i response', async (status, message) => {
      const { dedupedFetchJson } = await loadModule();
      fetchMock.mockResolvedValue(jsonResponse({ error: 'nope' }, { ok: false, status }));

      await expect(dedupedFetchJson('/api/runs')).rejects.toThrow(message);
    });

    it('exposes the status code on the rejected error', async () => {
      const { dedupedFetchJson, HttpError } = await loadModule();
      fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status: 404 }));

      const err = await dedupedFetchJson('/api/runs').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(HttpError);
      expect((err as InstanceType<typeof HttpError>).status).toBe(404);
    });

    it('does not attempt to parse the body of a non-ok response', async () => {
      const { dedupedFetchJson } = await loadModule();
      const json = vi.fn(() => Promise.reject(new Error('should not be called')));
      fetchMock.mockResolvedValue({ ok: false, status: 503, json } as unknown as Response);

      await expect(dedupedFetchJson('/api/runs')).rejects.toThrow('HTTP 503');
      expect(json).not.toHaveBeenCalled();
    });

    it('propagates a network-level rejection', async () => {
      const { dedupedFetchJson } = await loadModule();
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(dedupedFetchJson('/api/runs')).rejects.toThrow('Failed to fetch');
    });

    it('propagates a malformed-JSON rejection', async () => {
      const { dedupedFetchJson } = await loadModule();
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token <')),
      } as unknown as Response);

      await expect(dedupedFetchJson('/api/runs')).rejects.toThrow('Unexpected token <');
    });

    it('clears the in-flight entry after a failure so a retry can succeed', async () => {
      const { dedupedFetchJson } = await loadModule();
      fetchMock.mockRejectedValueOnce(new Error('network down'));
      fetchMock.mockResolvedValueOnce(jsonResponse({ total: 3 }));

      await expect(dedupedFetchJson('/api/runs')).rejects.toThrow('network down');
      await expect(dedupedFetchJson('/api/runs')).resolves.toEqual({ total: 3 });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('clears the in-flight entry after a non-ok response', async () => {
      const { dedupedFetchJson } = await loadModule();
      fetchMock.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 500 }));
      fetchMock.mockResolvedValueOnce(jsonResponse({ total: 1 }));

      await expect(dedupedFetchJson('/api/runs')).rejects.toThrow('HTTP 500');
      await expect(dedupedFetchJson('/api/runs')).resolves.toEqual({ total: 1 });
    });
  });

  describe('abort handling', () => {
    it('aborts the fetch when the caller signal aborts', async () => {
      const { dedupedFetchJson } = await loadModule();
      fetchMock.mockReturnValue(deferred<Response>().promise);

      const controller = new AbortController();
      const pending = dedupedFetchJson('/api/runs', controller.signal);
      const forwarded = signalOfCall(fetchMock);

      expect(forwarded.aborted).toBe(false);
      controller.abort(new Error('caller went away'));
      expect(forwarded.aborted).toBe(true);

      // Nothing rejects the returned promise here: the stubbed fetch ignores the
      // signal. Keep a handler attached so the pending promise is never orphaned.
      void pending.catch(() => {});
    });

    it('does not abort the shared request when only a later caller aborts', async () => {
      const { dedupedFetchJson } = await loadModule();
      const gate = deferred<Response>();
      fetchMock.mockReturnValue(gate.promise);

      const first = dedupedFetchJson('/api/runs');
      const lateController = new AbortController();
      const second = dedupedFetchJson('/api/runs', lateController.signal);

      // The second caller joins the in-flight request, so its signal is not
      // wired up at all — aborting it must not cancel the shared fetch.
      lateController.abort();
      expect(signalOfCall(fetchMock).aborted).toBe(false);

      gate.resolve(jsonResponse({ total: 2 }));
      expect(await first).toEqual({ total: 2 });
      expect(await second).toEqual({ total: 2 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('forwards an already-aborted caller signal as aborted', async () => {
      const { dedupedFetchJson } = await loadModule();
      fetchMock.mockReturnValue(deferred<Response>().promise);

      const controller = new AbortController();
      controller.abort();
      const pending = dedupedFetchJson('/api/runs', controller.signal);

      expect(signalOfCall(fetchMock).aborted).toBe(true);
      void pending.catch(() => {});
    });
  });
});
