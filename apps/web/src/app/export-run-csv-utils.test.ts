import * as assert from 'node:assert/strict';
import { buildRunsCsv, resolveCsvColumns, ALL_CSV_COLUMNS } from './export-run-csv-utils';
import type { FuzzingRun } from './types';

function makeRun(overrides: Partial<FuzzingRun> = {}): FuzzingRun {
  return {
    id: 'run-1',
    status: 'completed',
    area: 'auth',
    severity: 'low',
    duration: 1234,
    seedCount: 10,
    cpuInstructions: 500,
    memoryBytes: 2048,
    minResourceFee: 100,
    crashDetail: null,
    ...overrides,
  };
}

const runAssertions = () => {
  // No visibleColumns supplied -> every known column is exported.
  assert.deepEqual(resolveCsvColumns(undefined), ALL_CSV_COLUMNS);

  // Hidden fields (absent from visibleColumns) must not appear as columns at all,
  // empty or otherwise.
  const visible = ['id', 'status', 'duration'];
  const cols = resolveCsvColumns(visible);
  assert.deepEqual(cols, visible);
  assert.ok(!cols.includes('cpuInstructions'), 'hidden column cpuInstructions should be dropped');
  assert.ok(!cols.includes('memoryBytes'), 'hidden column memoryBytes should be dropped');

  // Unknown / UI-only ids (e.g. from a table's pseudo-columns) are ignored rather
  // than producing a blank column.
  assert.deepEqual(resolveCsvColumns(['id', 'actions', 'report']), ['id']);

  const run = makeRun();
  const csv = buildRunsCsv([run], visible);
  const [headerLine, dataLine] = csv.split('\n');

  assert.equal(headerLine, 'ID,Status,Duration (ms)');
  assert.equal(headerLine.split(',').length, dataLine.split(',').length);
  assert.equal(dataLine, 'run-1,completed,1234');
  assert.ok(!csv.includes(',,'), 'no empty column should be present between values');

  // Full export when no visibility filter is applied.
  const fullCsv = buildRunsCsv([run]);
  const [fullHeaderLine] = fullCsv.split('\n');
  assert.equal(fullHeaderLine.split(',').length, ALL_CSV_COLUMNS.length);
};

runAssertions();
console.log('export-run-csv-utils.test.ts: all assertions passed');
