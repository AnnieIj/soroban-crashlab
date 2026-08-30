# Per-Route-Group Bundle Budgets

Enforced via [`size-limit`](https://github.com/ai/size-limit) in `apps/web`.
Config lives in `apps/web/.size-limit.json`; CI runs in
`.github/workflows/size-limit.yml` and **fails the PR** when any route group
exceeds its budget.

## Route groups

| Route group        | Covers                                            | Budget (gzip) |
| ------------------ | ------------------------------------------------- | ------------- |
| `shell`            | `main-app`, `webpack`, root `layout` shared chunks | 120 kB        |
| `analytics-charts` | `.next/static/chunks/app/analytics/**`             | 170 kB        |
| `editor-grid`      | `.next/static/chunks/app/**/widget*/**`            | 130 kB        |

## Methodology

Budgets are set from **measured first-load JS + 10% headroom**. The numbers
above are the *proposed starting budgets*; they must be re-baselined against a
green `pnpm run build` before they are treated as authoritative (see
*Sequencing* below). To re-baseline:

1. From a clean `apps/web` with a successful `pnpm run build`:
   ```bash
   pnpm size --json > /tmp/size.json
   ```
2. Read each route group's `gzip` size, then set the limit to
   `measured * 1.10` (round up to a clean number).
3. Commit the updated `.size-limit.json` in the same PR that introduces the
   change (or as a follow-up budget-bump PR — see Override below).

## Why per-group

A single global chunk budget hides which surface regressed (the
charts-everywhere incident being the canonical example). Per-group budgets
name the offending route in CI output, so a PR that only touches analytics
cannot silently bloat the editor bundle, and vice-versa.

## Override procedure (budget bumps)

A PR that intentionally grows a budget (new chart type, new editor feature)
must **not** silently raise the limit. Budget-bump PRs require:

- A `## Budget bump` section in the PR body stating:
  - which route group's limit changed,
  - the old → new number,
  - the justification (feature need, dependency upgrade with no tree-shake path, etc.),
  - the expected steady-state size after the change lands.
- Maintainers review bumps the same as any behaviour change.

Emergency hotfixes may raise a limit with post-hoc justification within 24h,
but the justification must still be recorded in the merged PR.

## Simulated violation (local proof)

To confirm failure output is actionable, temporarily lower a budget far below
its real size, e.g. in `.size-limit.json` set `"limit": "1 B"` for
`analytics-charts`, then:

```bash
cd apps/web && pnpm size
```

`size-limit` exits non-zero and prints the offending group name and the
`size vs limit` delta, e.g.:

```
Package size limit has exceeded by 168 kB
  Path: .next/static/chunks/app/analytics/...
  Size: 169 kB (gzip)
  Limit: 1 B
```

(Exact numbers require a green build; the shape of the output is what matters
for the gate.)

## Sequencing

If the lazy-chart loading work (#1396-adjacent) merges first, re-baseline the
`analytics-charts` budget afterwards using the methodology above rather than
baking extra headroom into this PR to compensate. Headroom stays at 10%; do not
game it.
