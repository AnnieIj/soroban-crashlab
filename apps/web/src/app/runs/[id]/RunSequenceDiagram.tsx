'use client';

/**
 * Run sequence diagram view for contract call order (#1126).
 *
 * Shows the ordered chain of contract-to-contract calls a run produced: a
 * filter chip per outcome, and a vertical call list indented by nesting depth
 * so callers and callees read like a sequence diagram's lifelines.
 *
 * Filtering/summary logic lives in `run-sequence-diagram-utils` so it can be
 * unit-tested against the same code this component runs. Colours come from
 * the Navy Professional CSS variables, so both themes are covered without a
 * second palette.
 */

import React, { useMemo, useState } from 'react';
import type { ContractCallStatus, ContractCallStep } from '../../types';
import {
  CALL_STATUS_FILTERS,
  countForCallFilter,
  filterCallSteps,
  formatCallDuration,
  getCallParticipants,
  summarizeCallSequence,
  type CallStatusFilter,
} from './run-sequence-diagram-utils';

interface RunSequenceDiagramProps {
  steps: ContractCallStep[];
  /** Renders a skeleton while the call trace is still being fetched. */
  isLoading?: boolean;
  /** Message to surface instead of the diagram when loading failed. */
  error?: string | null;
}

const STATUS_COLORS: Record<ContractCallStatus, string> = {
  success: '#057642',
  failed: '#CC1016',
  pending: '#B7770F',
};

/** Tinted pill matching the semantic colour of a call's outcome. */
function StatusBadge({ status }: { status: ContractCallStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <span
      className="badge text-xs"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
    >
      {status.toUpperCase()}
    </span>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div
      className="rounded-xl border border-dashed p-8 text-center"
      style={{ borderColor: 'var(--border-color)', background: 'var(--bg)' }}
    >
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {title}
      </p>
      <p className="text-meta mt-1">{hint}</p>
    </div>
  );
}

export default function RunSequenceDiagram({
  steps,
  isLoading = false,
  error = null,
}: RunSequenceDiagramProps) {
  const [filter, setFilter] = useState<CallStatusFilter>('all');

  const summary = useMemo(() => summarizeCallSequence(steps), [steps]);
  const visibleSteps = useMemo(() => filterCallSteps(steps, filter), [steps, filter]);
  const participants = useMemo(() => getCallParticipants(steps), [steps]);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border p-4"
        style={{ borderColor: '#CC1016', background: 'rgba(204, 16, 22, 0.06)' }}
      >
        <p className="text-sm font-semibold" style={{ color: '#CC1016' }}>
          Could not load the call sequence
        </p>
        <p className="text-meta mt-1">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-live="polite">
        <span className="sr-only">Loading run sequence diagram</span>
        <div className="skeleton h-8 w-64" />
        {[0, 1, 2].map((index) => (
          <div key={index} className="skeleton h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (summary.total === 0) {
    return (
      <EmptyState
        title="No contract calls recorded"
        hint="Runs still in flight have not committed a final call trace yet. The sequence appears once the run finishes."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by call outcome">
          {CALL_STATUS_FILTERS.map((option) => {
            const isActive = filter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                aria-pressed={isActive}
                className={`chip text-xs ${isActive ? 'chip-active' : ''}`}
              >
                {option.label} ({countForCallFilter(summary, option.id)})
              </button>
            );
          })}
        </div>

        <p className="text-meta">
          {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
          {' · '}
          {formatCallDuration(summary.totalDurationMs)} total
        </p>
      </div>

      {visibleSteps.length === 0 ? (
        <EmptyState
          title="No calls match this filter"
          hint={`This run has no ${filter} calls. Choose a different outcome above.`}
        />
      ) : (
        <ol className="space-y-2">
          {visibleSteps.map((step) => (
            <li
              key={step.id}
              className="rounded-xl border p-3 flex flex-wrap items-center gap-2"
              style={{
                borderColor: 'var(--border-color)',
                background: 'var(--surface)',
                marginLeft: `${step.depth * 1.5}rem`,
              }}
            >
              <span className="code-text" style={{ color: 'var(--text-secondary)' }}>
                #{step.sequence}
              </span>
              <span className="code-text font-semibold" style={{ color: 'var(--text-primary)' }}>
                {step.caller}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>→</span>
              <span className="code-text font-semibold" style={{ color: 'var(--text-primary)' }}>
                {step.callee}
              </span>
              <span className="code-text" style={{ color: 'var(--text-secondary)' }}>
                .{step.method}()
              </span>
              <StatusBadge status={step.status} />
              <span className="text-meta ml-auto">{formatCallDuration(step.durationMs)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
