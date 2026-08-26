/**
 * Webhook dead-letter queue (#1427).
 *
 * A delivery that exhausts its retry budget used to vanish, leaving no record
 * that an endpoint had gone silent. Terminal failures now land here with the
 * request that failed and the full error timeline, so they can be browsed,
 * replayed, and — eventually — aged out.
 *
 * This module owns the post-failure lifecycle only. Building and signing the
 * outbound request stays with the delivery worker.
 */

import type { WebhookDeliveryRequest } from './webhook-delivery-worker';

/** Retention policy. Pinned so the sweep and its test cannot drift apart. */
export const DLQ_RETENTION_DAYS = 30;
export const DLQ_RETENTION_MS = DLQ_RETENTION_DAYS * 24 * 60 * 60 * 1000;

/** Replays run in sequential batches of this size to spare a sick endpoint. */
export const DLQ_REPLAY_CONCURRENCY = 5;

export type DlqFailureReason = 'retries-exhausted' | 'non-retryable';

export interface DlqAttemptNote {
  attempt: number;
  statusCode?: number;
  error?: string;
  at: string;
}

export interface DlqEntry {
  id: string;
  requestId: string;
  endpoint: string;
  eventType: string;
  payload: unknown;
  headers?: Record<string, string>;
  reason: DlqFailureReason;
  /** Every attempt that led here, plus notes appended by failed replays. */
  errorTimeline: DlqAttemptNote[];
  firstFailedAt: string;
  deadLetteredAt: string;
  replayAttempts: number;
}

export interface DlqFilter {
  endpoint?: string;
  reason?: DlqFailureReason;
  /** Only entries dead-lettered within this many milliseconds of `now`. */
  maxAgeMs?: number;
}

export interface DlqGateway {
  load(): DlqEntry[];
  save(entries: readonly DlqEntry[]): void;
}

export function createInMemoryDlqGateway(seed: readonly DlqEntry[] = []): DlqGateway {
  let entries = [...seed];
  return {
    load: () => [...entries],
    save: (next) => {
      entries = [...next];
    },
  };
}

export function createDlqEntry(input: {
  request: WebhookDeliveryRequest;
  timeline: readonly DlqAttemptNote[];
  reason: DlqFailureReason;
  now: string;
}): DlqEntry {
  const timeline = [...input.timeline];
  return {
    id: `dlq-${input.request.id}`,
    requestId: input.request.id,
    endpoint: input.request.url,
    eventType: input.request.eventType,
    payload: input.request.payload,
    headers: input.request.headers,
    reason: input.reason,
    errorTimeline: timeline,
    firstFailedAt: timeline[0]?.at ?? input.now,
    deadLetteredAt: input.now,
    replayAttempts: 0,
  };
}

export function filterDlqEntries(
  entries: readonly DlqEntry[],
  filter: DlqFilter = {},
  now: number = Date.now(),
): DlqEntry[] {
  const needle = filter.endpoint?.trim().toLowerCase();
  return entries.filter((entry) => {
    if (needle && !entry.endpoint.toLowerCase().includes(needle)) return false;
    if (filter.reason && entry.reason !== filter.reason) return false;
    if (filter.maxAgeMs !== undefined) {
      const age = now - Date.parse(entry.deadLetteredAt);
      if (age > filter.maxAgeMs) return false;
    }
    return true;
  });
}

/** Deterministic so a retried replay reuses the key the first one sent. */
export function deriveReplayKey(entryId: string, attempt: number): string {
  return `${entryId}#replay-${attempt}`;
}

export function sweepExpiredEntries(
  entries: readonly DlqEntry[],
  now: number,
  retentionMs: number = DLQ_RETENTION_MS,
): { kept: DlqEntry[]; evicted: DlqEntry[] } {
  const kept: DlqEntry[] = [];
  const evicted: DlqEntry[] = [];
  for (const entry of entries) {
    const age = now - Date.parse(entry.deadLetteredAt);
    if (age > retentionMs) evicted.push(entry);
    else kept.push(entry);
  }
  return { kept, evicted };
}

export type ReplayStatus = 'replayed' | 'failed' | 'locked' | 'missing';

export interface ReplayResult {
  status: ReplayStatus;
  entryId: string;
  idempotencyKey?: string;
  error?: string;
}

export interface BatchReplayResult {
  results: ReplayResult[];
  replayed: number;
  failed: number;
  /** Number of sequential batches run, i.e. ceil(count / concurrency). */
  batches: number;
}

export interface DlqReplayOutcome {
  ok: boolean;
  statusCode?: number;
  error?: string;
}

export interface DeadLetterQueueOptions {
  gateway?: DlqGateway;
  /** Redelivers the entry. Receives the deterministic idempotency key. */
  replayDelivery: (entry: DlqEntry, idempotencyKey: string) => Promise<DlqReplayOutcome>;
  now?: () => Date;
  retentionMs?: number;
  concurrency?: number;
}

export class DeadLetterQueue {
  private readonly gateway: DlqGateway;
  private readonly replayDelivery: DeadLetterQueueOptions['replayDelivery'];
  private readonly now: () => Date;
  private readonly retentionMs: number;
  private readonly concurrency: number;
  /** Entry ids with a replay in flight — the idempotency lock. */
  private readonly inFlight = new Set<string>();

  constructor(options: DeadLetterQueueOptions) {
    this.gateway = options.gateway ?? createInMemoryDlqGateway();
    this.replayDelivery = options.replayDelivery;
    this.now = options.now ?? (() => new Date());
    this.retentionMs = options.retentionMs ?? DLQ_RETENTION_MS;
    this.concurrency = options.concurrency ?? DLQ_REPLAY_CONCURRENCY;
  }

  list(filter: DlqFilter = {}): DlqEntry[] {
    return filterDlqEntries(this.gateway.load(), filter, this.now().getTime());
  }

  depth(): number {
    return this.gateway.load().length;
  }

  add(entry: DlqEntry): void {
    const entries = this.gateway.load();
    // Re-dead-lettering the same request replaces its entry rather than
    // stacking duplicates for the same failing delivery.
    this.gateway.save([...entries.filter((existing) => existing.id !== entry.id), entry]);
  }

  isLocked(entryId: string): boolean {
    return this.inFlight.has(entryId);
  }

  /** Drops entries past the retention window. Returns how many were evicted. */
  sweep(): number {
    const { kept, evicted } = sweepExpiredEntries(
      this.gateway.load(),
      this.now().getTime(),
      this.retentionMs,
    );
    if (evicted.length > 0) this.gateway.save(kept);
    return evicted.length;
  }

  evict(entryId: string): boolean {
    const entries = this.gateway.load();
    const next = entries.filter((entry) => entry.id !== entryId);
    if (next.length === entries.length) return false;
    this.gateway.save(next);
    return true;
  }

  /**
   * Replays one entry. A success removes it from the queue; a failure leaves it
   * in place with the attempt appended to its timeline, so the failure chain
   * keeps growing instead of being overwritten.
   */
  async replay(entryId: string): Promise<ReplayResult> {
    if (this.inFlight.has(entryId)) {
      return { status: 'locked', entryId };
    }

    const entry = this.gateway.load().find((candidate) => candidate.id === entryId);
    if (!entry) return { status: 'missing', entryId };

    const attempt = entry.replayAttempts + 1;
    const idempotencyKey = deriveReplayKey(entry.id, attempt);
    this.inFlight.add(entryId);

    try {
      const outcome = await this.replayDelivery(entry, idempotencyKey);
      const at = this.now().toISOString();

      if (outcome.ok) {
        this.gateway.save(this.gateway.load().filter((candidate) => candidate.id !== entryId));
        return { status: 'replayed', entryId, idempotencyKey };
      }

      const updated: DlqEntry = {
        ...entry,
        replayAttempts: attempt,
        errorTimeline: [
          ...entry.errorTimeline,
          {
            attempt: entry.errorTimeline.length + 1,
            statusCode: outcome.statusCode,
            error: outcome.error ?? 'Replay failed',
            at,
          },
        ],
      };
      this.gateway.save(
        this.gateway.load().map((candidate) => (candidate.id === entryId ? updated : candidate)),
      );
      return { status: 'failed', entryId, idempotencyKey, error: updated.errorTimeline.at(-1)?.error };
    } finally {
      this.inFlight.delete(entryId);
    }
  }

  /** Replays many entries in sequential batches capped at `concurrency`. */
  async replayBatch(entryIds: readonly string[]): Promise<BatchReplayResult> {
    const results: ReplayResult[] = [];
    let batches = 0;

    for (let index = 0; index < entryIds.length; index += this.concurrency) {
      const slice = entryIds.slice(index, index + this.concurrency);
      batches += 1;
      results.push(...(await Promise.all(slice.map((id) => this.replay(id)))));
    }

    return {
      results,
      replayed: results.filter((result) => result.status === 'replayed').length,
      failed: results.filter((result) => result.status === 'failed').length,
      batches,
    };
  }
}
