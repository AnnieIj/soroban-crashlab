import { FuzzingRun } from './types';

export interface FuzzySearchResult {
  run: FuzzingRun;
  score: number;
  matchedFields: Array<{ field: string; value: string }>;
}

function normalize(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase().trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  if (a.length > b.length) [a, b] = [b, a];
  const row = new Array(a.length + 1).fill(0).map((_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = row[0];
    row[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = row[i];
      row[i] = Math.min(
        prev + (a[i - 1] === b.charAt(j - 1) ? 0 : 1),
        row[i] + 1,
        row[i - 1] + 1,
      );
      prev = tmp;
    }
  }
  return row[a.length];
}

function fieldScore(haystack: string, needle: string): number {
  if (!needle || !haystack) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (h === n) return 100;
  if (h.startsWith(n)) return 90;
  if (h.includes(n)) return 75;
  const dist = levenshtein(n, h.substring(0, Math.min(h.length, n.length + 3)));
  if (dist <= 1) return 60;
  if (dist <= 2) return 40;
  if (dist <= 3) return 20;
  const words = h.split(/\s+/);
  for (const word of words) {
    if (word.includes(n)) return 50;
    const wd = levenshtein(n, word);
    if (wd <= 1) return 45;
    if (wd <= 2) return 25;
  }
  return 0;
}

interface RunField {
  key: string;
  label: string;
  value: string;
}

function getRunFields(run: FuzzingRun): RunField[] {
  const fields: RunField[] = [
    { key: 'id', label: 'Run ID', value: normalize(run.id) },
    { key: 'status', label: 'Status', value: normalize(run.status) },
    { key: 'area', label: 'Area', value: normalize(run.area) },
    { key: 'severity', label: 'Severity', value: normalize(run.severity) },
    { key: 'duration', label: 'Duration', value: normalize(run.duration) },
    { key: 'seedCount', label: 'Seed Count', value: normalize(run.seedCount) },
    { key: 'cpuInstructions', label: 'CPU Instructions', value: normalize(run.cpuInstructions) },
    { key: 'memoryBytes', label: 'Memory Bytes', value: normalize(run.memoryBytes) },
    { key: 'minResourceFee', label: 'Min Resource Fee', value: normalize(run.minResourceFee) },
  ];
  if (run.crashDetail) {
    fields.push({ key: 'crashDetail.failureCategory', label: 'Failure Category', value: normalize(run.crashDetail.failureCategory) });
    fields.push({ key: 'crashDetail.signature', label: 'Crash Signature', value: normalize(run.crashDetail.signature) });
    if (run.crashDetail.signatureHash) fields.push({ key: 'crashDetail.signatureHash', label: 'Signature Hash', value: normalize(run.crashDetail.signatureHash) });
    fields.push({ key: 'crashDetail.payload', label: 'Crash Payload', value: normalize(run.crashDetail.payload) });
    fields.push({ key: 'crashDetail.replayAction', label: 'Replay Action', value: normalize(run.crashDetail.replayAction) });
  }
  if (run.tags) {
    run.tags.forEach((tag, i) => {
      fields.push({ key: `tags[${i}]`, label: 'Tag', value: normalize(tag) });
    });
  }
  if (run.annotations) {
    run.annotations.forEach((note, i) => {
      fields.push({ key: `annotations[${i}]`, label: 'Annotation', value: normalize(note) });
    });
  }
  if (run.associatedIssues) {
    run.associatedIssues.forEach((issue, i) => {
      fields.push({ key: `associatedIssues[${i}]`, label: 'Issue', value: normalize(issue.label) });
    });
  }
  return fields;
}

export function fuzzySearch(
  runs: FuzzingRun[],
  query: string,
): FuzzySearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  const results: FuzzySearchResult[] = [];
  for (const run of runs) {
    const fields = getRunFields(run);
    let totalScore = 0;
    const matchedFields: Array<{ field: string; value: string }> = [];
    for (const field of fields) {
      let fieldMatched = false;
      for (const token of tokens) {
        const s = fieldScore(field.value, token);
        if (s > 0) {
          totalScore += s;
          if (!fieldMatched) {
            matchedFields.push({ field: field.label, value: field.value });
            fieldMatched = true;
          }
        }
      }
    }
    if (totalScore > 0) {
      results.push({ run, score: totalScore, matchedFields });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}

export function getSearchableFieldLabels(): string[] {
  return [
    'Run ID', 'Status', 'Area', 'Severity', 'Duration',
    'Seed Count', 'CPU Instructions', 'Memory Bytes', 'Min Resource Fee',
    'Failure Category', 'Crash Signature', 'Signature Hash',
    'Crash Payload', 'Replay Action', 'Tag', 'Annotation', 'Issue',
  ];
}
