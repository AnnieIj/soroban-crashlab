/**
 * Pure helpers behind the run sequence diagram view (#1126).
 *
 * This logic lives outside the component so it can be unit-tested with plain
 * Node, and so the tests exercise the same code the UI runs instead of a copy
 * of it.
 */

import type { ContractCallStatus, ContractCallStep } from '../../types';

/** Filter applied to the call list; `all` disables filtering. */
export type CallStatusFilter = 'all' | ContractCallStatus;

export const CALL_STATUS_FILTERS: readonly { id: CallStatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'success', label: 'Success' },
    { id: 'failed', label: 'Failed' },
    { id: 'pending', label: 'Pending' },
];

/** Returns the calls matching `filter`, preserving input order. */
export function filterCallSteps(
    steps: readonly ContractCallStep[],
    filter: CallStatusFilter,
): ContractCallStep[] {
    if (filter === 'all') return [...steps];
    return steps.filter((step) => step.status === filter);
}

/** Per-status totals used by the summary strip and the filter chip counts. */
export interface CallSequenceSummary {
    total: number;
    success: number;
    failed: number;
    pending: number;
    maxDepth: number;
    totalDurationMs: number;
}

export function summarizeCallSequence(
    steps: readonly ContractCallStep[],
): CallSequenceSummary {
    const summary: CallSequenceSummary = {
        total: steps.length,
        success: 0,
        failed: 0,
        pending: 0,
        maxDepth: 0,
        totalDurationMs: 0,
    };

    for (const step of steps) {
        if (step.status === 'success') summary.success += 1;
        else if (step.status === 'failed') summary.failed += 1;
        else if (step.status === 'pending') summary.pending += 1;

        if (step.depth > summary.maxDepth) summary.maxDepth = step.depth;
        summary.totalDurationMs += step.durationMs;
    }

    return summary;
}

/** Count for a single filter, so chips can show how much each one holds. */
export function countForCallFilter(
    summary: CallSequenceSummary,
    filter: CallStatusFilter,
): number {
    return filter === 'all' ? summary.total : summary[filter];
}

/**
 * Ordered, de-duplicated list of participants (callers and callees) as they
 * first appear in the sequence — the "lanes" a sequence diagram would draw.
 */
export function getCallParticipants(steps: readonly ContractCallStep[]): string[] {
    const seen = new Set<string>();
    const participants: string[] = [];

    for (const step of steps) {
        if (!seen.has(step.caller)) {
            seen.add(step.caller);
            participants.push(step.caller);
        }
        if (!seen.has(step.callee)) {
            seen.add(step.callee);
            participants.push(step.callee);
        }
    }

    return participants;
}

/** Human-readable duration: milliseconds under a second, seconds beyond it. */
export function formatCallDuration(durationMs: number): string {
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(1)}s`;
}
