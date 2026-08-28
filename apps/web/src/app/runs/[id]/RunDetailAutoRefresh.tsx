'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RunStatus } from '../../types';
import { useRunStream } from './useRunStream';

const POLL_INTERVAL_MS = 5_000;
const TERMINAL_STATUSES: ReadonlySet<RunStatus> = new Set(['completed', 'failed', 'cancelled']);

interface RunDetailAutoRefreshProps {
  runId: string;
  initialStatus: RunStatus;
}

export default function RunDetailAutoRefresh({ runId, initialStatus }: RunDetailAutoRefreshProps) {
  const router = useRouter();
  const [status, setStatus] = useState<RunStatus>(initialStatus);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stream = useRunStream(runId, (envelope) => {
    if (envelope.event.type === 'RUN_STATUS') {
      setStatus(envelope.event.status);
      router.refresh();
    }
  });

  useEffect(() => {
    if (TERMINAL_STATUSES.has(status)) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/runs/${encodeURIComponent(runId)}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = (await res.json()) as { status?: RunStatus };
          if (data.status && data.status !== status) {
            setStatus(data.status);
            router.refresh();
          }
        }
      } catch {
        // Silently ignore fetch errors during polling
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [runId, status, router]);

  return (
    <span className={`badge badge-${status}`}>
      {status}
      {stream.connected && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" aria-label="Live updates" />}
      {!TERMINAL_STATUSES.has(status) && (
        <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
    </span>
  );
}
