import * as assert from 'node:assert/strict';
import {
    CALL_STATUS_FILTERS,
    countForCallFilter,
    filterCallSteps,
    formatCallDuration,
    getCallParticipants,
    summarizeCallSequence,
} from './run-sequence-diagram-utils';
import type { ContractCallStep } from '../../types';

const steps: ContractCallStep[] = [
    { id: 'c1', sequence: 1, caller: 'harness', callee: 'token', method: 'transfer', depth: 0, status: 'success', durationMs: 10 },
    { id: 'c2', sequence: 2, caller: 'token', callee: 'account', method: 'require_auth', depth: 1, status: 'success', durationMs: 5 },
    { id: 'c3', sequence: 3, caller: 'token', callee: 'allowance', method: 'spend_allowance', depth: 1, status: 'failed', durationMs: 1200 },
];

// ---------------------------------------------------------------------------
// filterCallSteps
// ---------------------------------------------------------------------------

function testFilterAllReturnsEverything(): void {
    assert.equal(filterCallSteps(steps, 'all').length, 3);
}

function testFilterByStatus(): void {
    const failed = filterCallSteps(steps, 'failed');
    assert.equal(failed.length, 1);
    assert.equal(failed[0].id, 'c3');
}

function testFilterEmptyInput(): void {
    assert.deepEqual(filterCallSteps([], 'all'), []);
    assert.deepEqual(filterCallSteps([], 'success'), []);
}

function testFilterDoesNotMutateInput(): void {
    const copy = [...steps];
    filterCallSteps(steps, 'success');
    assert.deepEqual(steps, copy);
}

// ---------------------------------------------------------------------------
// summarizeCallSequence
// ---------------------------------------------------------------------------

function testSummarizeCounts(): void {
    const summary = summarizeCallSequence(steps);
    assert.equal(summary.total, 3);
    assert.equal(summary.success, 2);
    assert.equal(summary.failed, 1);
    assert.equal(summary.pending, 0);
    assert.equal(summary.maxDepth, 1);
    assert.equal(summary.totalDurationMs, 1215);
}

function testSummarizeEmpty(): void {
    const summary = summarizeCallSequence([]);
    assert.equal(summary.total, 0);
    assert.equal(summary.maxDepth, 0);
    assert.equal(summary.totalDurationMs, 0);
}

function testCountForFilterMatchesSummary(): void {
    const summary = summarizeCallSequence(steps);
    for (const { id } of CALL_STATUS_FILTERS) {
        assert.equal(countForCallFilter(summary, id), id === 'all' ? summary.total : summary[id]);
    }
}

// ---------------------------------------------------------------------------
// getCallParticipants
// ---------------------------------------------------------------------------

function testParticipantsOrderedAndDeduplicated(): void {
    const participants = getCallParticipants(steps);
    assert.deepEqual(participants, ['harness', 'token', 'account', 'allowance']);
}

function testParticipantsEmptyInput(): void {
    assert.deepEqual(getCallParticipants([]), []);
}

// ---------------------------------------------------------------------------
// formatCallDuration
// ---------------------------------------------------------------------------

function testFormatDurationMilliseconds(): void {
    assert.equal(formatCallDuration(0), '0ms');
    assert.equal(formatCallDuration(999), '999ms');
}

function testFormatDurationSeconds(): void {
    assert.equal(formatCallDuration(1000), '1.0s');
    assert.equal(formatCallDuration(2500), '2.5s');
}

// ---------------------------------------------------------------------------
// Run all
// ---------------------------------------------------------------------------

testFilterAllReturnsEverything();
testFilterByStatus();
testFilterEmptyInput();
testFilterDoesNotMutateInput();

testSummarizeCounts();
testSummarizeEmpty();
testCountForFilterMatchesSummary();

testParticipantsOrderedAndDeduplicated();
testParticipantsEmptyInput();

testFormatDurationMilliseconds();
testFormatDurationSeconds();

console.log('run-sequence-diagram-utils.test.ts: all assertions passed');
