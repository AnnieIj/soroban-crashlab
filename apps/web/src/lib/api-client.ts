import {
  FuzzingRun,
  CrashEvent,
  SignatureFrequency,
  CrashTrendPoint,
  RunIssueLink,
  CampaignConfig,
} from '../app/types';
import { dedupedFetchJson, HttpError } from './request-dedup';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function apiUrl(path: string): string {
  return `${API_BASE}/api${path}`;
}

function unwrapApiPayload<T>(json: unknown): T {
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
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const message = await res
      .json()
      .then((body: { error?: string }) => body?.error)
      .catch(() => undefined);
    throw new ApiError(res.status, message ?? `API error: ${res.status} ${res.statusText}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return unwrapApiPayload<T>(await res.json());
}

export interface ArtifactMetadata {
  id: string;
  name: string;
  createdAt: string;
  sizeBytes: number;
}

export interface NotificationFeedItem {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  read: boolean;
}

export const api = {
  runs: {
    // GETs are deduped: several routes (dashboard, runs list, trends, triage,
    // analytics) independently fetch /api/runs on mount, so concurrent calls
    // share one in-flight request instead of issuing duplicate network calls.
    list: (signal?: AbortSignal) =>
      dedupedFetchJson<{ runs: FuzzingRun[]; total: number }>(apiUrl('/runs'), signal),
    get: (id: string, signal?: AbortSignal) =>
      dedupedFetchJson<FuzzingRun>(apiUrl(`/runs/${encodeURIComponent(id)}`), signal),
    issues: {
      list: (runId: string) =>
        apiFetch<{ runId: string; issues: RunIssueLink[] }>(
          `/runs/${encodeURIComponent(runId)}/issues`,
        ),
      add: (runId: string, link: RunIssueLink) =>
        apiFetch<{ runId: string; issues: RunIssueLink[] }>(
          `/runs/${encodeURIComponent(runId)}/issues`,
          { method: 'POST', body: JSON.stringify(link) },
        ),
      remove: (runId: string, href: string) =>
        apiFetch<{ runId: string; issues: RunIssueLink[] }>(
          `/runs/${encodeURIComponent(runId)}/issues`,
          { method: 'DELETE', body: JSON.stringify({ href }) },
        ),
    },
    tags: {
      list: (runId: string) =>
        apiFetch<{ runId: string; tags: string[] }>(`/runs/${encodeURIComponent(runId)}/tags`),
      add: (runId: string, tag: string) =>
        apiFetch<{ runId: string; tags: string[] }>(`/runs/${encodeURIComponent(runId)}/tags`, {
          method: 'POST',
          body: JSON.stringify({ tag }),
        }),
      remove: (runId: string, tag: string) =>
        apiFetch<{ runId: string; tags: string[] }>(`/runs/${encodeURIComponent(runId)}/tags`, {
          method: 'DELETE',
          body: JSON.stringify({ tag }),
        }),
    },
    annotations: {
      list: (runId: string) =>
        apiFetch<{ runId: string; annotations: string[] }>(
          `/runs/${encodeURIComponent(runId)}/annotations`,
        ),
      add: (runId: string, text: string) =>
        apiFetch<{ runId: string; annotations: string[] }>(
          `/runs/${encodeURIComponent(runId)}/annotations`,
          { method: 'POST', body: JSON.stringify({ text }) },
        ),
      remove: (runId: string, index: number) =>
        apiFetch<{ runId: string; annotations: string[] }>(
          `/runs/${encodeURIComponent(runId)}/annotations`,
          { method: 'DELETE', body: JSON.stringify({ index }) },
        ),
    },
  },
  analytics: {
    trends: () =>
      apiFetch<{ trends: CrashTrendPoint[]; signatures: SignatureFrequency[] }>('/runs/trends'),
    events: () => apiFetch<{ events: CrashEvent[] }>('/runs/events'),
  },
  artifacts: {
    list: () =>
      apiFetch<{ artifacts: ArtifactMetadata[]; total: number }>('/artifacts', {
        cache: 'no-store',
      }),
    download: async (id: string): Promise<Blob> => {
      const res = await fetch(apiUrl(`/artifacts/${encodeURIComponent(id)}`));
      if (!res.ok) {
        const message = await res
          .json()
          .then((body: { error?: string }) => body?.error)
          .catch(() => undefined);
        throw new ApiError(res.status, message ?? `API error: ${res.status} ${res.statusText}`);
      }
      return res.blob();
    },
    remove: (id: string) =>
      apiFetch<{ success: boolean; message: string }>(`/artifacts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },
  campaigns: {
    create: (config: CampaignConfig) =>
      apiFetch<{ campaign: Record<string, unknown> }>('/campaigns', {
        method: 'POST',
        body: JSON.stringify(config),
      }),
  },
  notifications: {
    list: () => apiFetch<{ notifications: NotificationFeedItem[]; total: number }>('/notifications'),
  },
  webhooks: {
    list: () => apiFetch<{ webhooks: unknown[] }>('/webhooks'),
  },
  integrations: {
    list: () => apiFetch<{ integrations: unknown[] }>('/integrations'),
  },
};

export async function fetchRuns(signal?: AbortSignal): Promise<{ runs: FuzzingRun[]; total: number }> {
  return api.runs.list(signal);
}

/**
 * Status code of a failed request, if the error carries one. `apiFetch` rejects
 * with `ApiError` while the deduped GET path rejects with `HttpError`, so
 * matching on the shared `status` field covers both.
 */
function statusOf(err: unknown): number | undefined {
  if (err instanceof ApiError || err instanceof HttpError) return err.status;
  return undefined;
}

export async function fetchRun(id: string, signal?: AbortSignal): Promise<FuzzingRun | null> {
  try {
    return await api.runs.get(id, signal);
  } catch (err) {
    if (statusOf(err) === 404) {
      return null;
    }
    throw err;
  }
}
