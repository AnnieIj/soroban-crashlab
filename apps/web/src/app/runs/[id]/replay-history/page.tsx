import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildMockRuns } from '../../../mockRuns';
import AddRunReplayHistoryWithTimestamps from '../../../add-run-replay-history-with-timestamps';

export const dynamic = 'force-dynamic';

interface ReplayHistoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReplayHistoryPage({ params }: ReplayHistoryPageProps) {
  const { id } = await params;
  const run = buildMockRuns().find((r) => r.id === id);

  if (!run) {
    notFound();
  }

  return (
    <div className="container-full page-padding fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/runs/${id}`} className="btn-ghost text-sm px-3 h-8">
          ← Run Details
        </Link>
        <span className="text-meta">/</span>
        <span className="text-meta">Replay History</span>
      </div>

      <div className="mb-6">
        <h1 className="heading-page">Replay History</h1>
        <p className="text-meta mt-1">
          All replays triggered from{' '}
          <span className="code-text">{id}</span>
          {' '}— timestamps, durations, and status changes.
        </p>
      </div>

      <AddRunReplayHistoryWithTimestamps sourceRunId={id} title="Replay History" />
    </div>
  );
}
