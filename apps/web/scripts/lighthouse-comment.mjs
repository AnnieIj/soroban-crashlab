/**
 * Renders the Lighthouse CI results as a compact markdown score table.
 *
 * Writes `.lighthouseci/comment.md` for the sticky PR comment and echoes the
 * same markdown to stdout for the job summary.
 *
 * Deliberately not a JSON wall: on failure it prints one line per broken
 * assertion naming the route, the audit, the budget and the measured value.
 *
 * Issue: #1408 - Lighthouse CI budgets on key pages with PR score comments
 */

import fs from 'node:fs';
import path from 'node:path';

const LHCI_DIR = path.resolve(process.cwd(), '.lighthouseci');
const OUT_FILE = path.join(LHCI_DIR, 'comment.md');

/** Reads a JSON artifact LHCI may or may not have produced. */
function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

/** `http://127.0.0.1:3210/runs` -> `/runs` */
function toRoute(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * Median of a numeric list.
 *
 * This mirrors how LHCI aggregates the runs before asserting, so the numbers
 * in the table are the same ones the budgets were checked against.
 */
function median(values) {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** 0.93 -> "93" ; missing -> "—" */
function score(value) {
  return typeof value === 'number' ? String(Math.round(value * 100)) : '—';
}

/** Green/amber/red circle on Lighthouse's own 90/50 boundaries. */
function scoreIcon(value) {
  if (typeof value !== 'number') return '';
  if (value >= 0.9) return '🟢';
  if (value >= 0.5) return '🟠';
  return '🔴';
}

/** Milliseconds -> "1.80 s"; unitless metrics (CLS) keep three decimals. */
function formatValue(auditId, value) {
  if (typeof value !== 'number') return String(value);
  if (auditId === 'cumulative-layout-shift') return value.toFixed(3);
  if (auditId === 'categories:performance' || auditId === 'categories:accessibility') {
    return String(Math.round(value * 100));
  }
  if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
  return `${Math.round(value)} ms`;
}

const lines = [];
lines.push('## 🚦 Lighthouse budgets');
lines.push('');

const reportFiles = fs.existsSync(LHCI_DIR)
  ? fs
      .readdirSync(LHCI_DIR)
      .filter((f) => f.startsWith('lhr-') && f.endsWith('.json'))
      .map((f) => path.join(LHCI_DIR, f))
  : [];

function emit() {
  const output = lines.join('\n');
  fs.mkdirSync(LHCI_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, output);
  console.log(output);
}

if (reportFiles.length === 0) {
  lines.push('> Lighthouse produced no reports — the collect step failed before');
  lines.push('> any route was audited. Check the job log for the server startup.');
  emit();
  process.exit(0);
}

// Group every sample by the URL it audited.
const byUrl = new Map();
for (const file of reportFiles) {
  const lhr = readJson(file, null);
  if (!lhr?.requestedUrl) continue;
  const samples = byUrl.get(lhr.requestedUrl) ?? [];
  samples.push({
    performance: lhr.categories?.performance?.score,
    accessibility: lhr.categories?.accessibility?.score,
    lcp: lhr.audits?.['largest-contentful-paint']?.numericValue,
    cls: lhr.audits?.['cumulative-layout-shift']?.numericValue,
  });
  byUrl.set(lhr.requestedUrl, samples);
}

const assertions = readJson(path.join(LHCI_DIR, 'assertion-results.json'), []);
const links = readJson(path.join(LHCI_DIR, 'links.json'), {});
const sampleCount = Math.max(...[...byUrl.values()].map((s) => s.length));

lines.push(
  `Median of ${sampleCount} runs per route · desktop preset · pinned Slow-4G throttling.`,
);
lines.push('');
lines.push('| Route | Perf | A11y | LCP | CLS | Report |');
lines.push('| --- | --- | --- | --- | --- | --- |');

for (const [url, samples] of byUrl) {
  const pick = (key) => median(samples.map((s) => s[key]).filter((v) => typeof v === 'number'));
  const perf = pick('performance');
  const a11y = pick('accessibility');
  const lcp = pick('lcp');
  const cls = pick('cls');
  const link = links[url];

  lines.push(
    `| \`${toRoute(url)}\` | ${scoreIcon(perf)} ${score(perf)} | ${scoreIcon(a11y)} ${score(a11y)} ` +
      `| ${lcp === undefined ? '—' : formatValue('largest-contentful-paint', lcp)} ` +
      `| ${cls === undefined ? '—' : formatValue('cumulative-layout-shift', cls)} ` +
      `| ${link ? `[report](${link})` : '—'} |`,
  );
}

const failures = assertions.filter((a) => !a.passed);

lines.push('');
if (failures.length === 0) {
  lines.push('✅ **All budgets met.**');
} else {
  lines.push(`❌ **${failures.length} budget ${failures.length === 1 ? 'miss' : 'misses'}.**`);
  lines.push('');
  lines.push('| Route | Audit | Budget | Measured |');
  lines.push('| --- | --- | --- | --- |');

  for (const failure of failures) {
    // `auditId` is absent for category assertions; `name` carries e.g.
    // "categories:performance" in that case.
    const auditId = failure.auditId ?? failure.name;
    const comparator = failure.operator === '>=' ? '≥' : '≤';
    lines.push(
      `| \`${toRoute(failure.url ?? '')}\` | \`${auditId}\` ` +
        `| ${comparator} ${formatValue(auditId, failure.expected)} ` +
        `| **${formatValue(auditId, failure.actual)}** |`,
    );
  }
}

lines.push('');
lines.push(
  '<sub>CI gate only — no dashboards, no RUM. Budgets, their derivation and the ' +
    'variance study live in `apps/web/lighthouserc.js`.</sub>',
);

emit();
