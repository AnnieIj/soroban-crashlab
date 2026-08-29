"use client";

import { memo, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { FuzzingRun, RunArea, RunSeverity } from "../types";
import { FilterBar } from "./FilterBar";
import { AnomalySensitivityToggle } from "./AnomalySensitivityToggle";
import { TrendsChartSkeleton } from "../../components/LoadingSkeleton";

// Lazy-load the recharts bundle (~90 KB gzipped). Only analytics/trends routes
// pay the chart cost; dashboard/runs/settings pages are excluded from this chunk.
const CrashTrendChart = dynamic(
  () => import("./CrashTrendChart").then((m) => ({ default: m.CrashTrendChart })),
  { loading: () => <TrendsChartSkeleton />, ssr: false }
);
import { fetchRuns } from "../../lib/api-client";
import {
  transformRunsToCrashEvents,
  bucketByDay,
  buildChartData,
  extractSignatureMetadata,
  isChartDataEmpty,
} from "../utils/trendAggregation";
import {
  AnomalySensitivity,
  buildDailyRateSeries,
  detectAnomalies,
} from "../utils/trendAnomaly";

/**
 * Crash Signature Frequency Trend page.
 *
 * Visualizes crash signature frequency over time with interactive
 * filtering by area, severity, and specific signatures.
 */
export default function CrashTrendPage() {
  const [runs, setRuns] = useState<FuzzingRun[]>([]);
  const [_dataState, setDataState] = useState<"loading" | "success" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    fetchRuns()
      .then((data) => {
        if (!cancelled) {
          setRuns(data.runs ?? []);
          setDataState("success");
        }
      })
      .catch(() => {
        if (!cancelled) setDataState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter state
  const [selectedAreas, setSelectedAreas] = useState<RunArea[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<RunSeverity[]>(
    [],
  );
  const [selectedSignatures, setSelectedSignatures] = useState<string[]>([]);

  // Aggregate and filter data reactively
  const { chartData, availableAreas, availableSignatures } = useMemo(() => {
    // Step 1: Transform runs to crash events
    const events = transformRunsToCrashEvents(runs);

    // Step 2: Get unique areas from all events
    const areasSet = new Set(events.map((e) => e.area));
    const allAreas = Array.from(areasSet).sort();

    // Step 3: Bucket events by day with area/severity filters
    const buckets = bucketByDay(events, selectedAreas, selectedSeverities);

    // Step 4: Extract signatures from filtered data
    const sigMetadata = extractSignatureMetadata(
      Array.from(buckets.values()).flat(),
    );

    // Step 5: Build chart data with signature filter
    const chartDataRaw = buildChartData(buckets, selectedSignatures);

    return {
      chartData: chartDataRaw,
      availableAreas: allAreas,
      availableSignatures: sigMetadata,
    };
  }, [runs, selectedAreas, selectedSeverities, selectedSignatures]);

  // Determine which signatures are in the filtered data
  const availableSignaturesFiltered = useMemo(() => {
    return availableSignatures.filter((sig) =>
      chartData.some((point) => point[sig.signature] !== undefined),
    );
  }, [availableSignatures, chartData]);

  // Auto-select all signatures on first render if none selected
  const effectiveSelectedSignatures = useMemo(() => {
    if (
      selectedSignatures.length === 0 &&
      availableSignaturesFiltered.length > 0
    ) {
      return availableSignaturesFiltered.map((s) => s.signature);
    }
    return selectedSignatures;
  }, [selectedSignatures, availableSignaturesFiltered]);

  const isEmpty = isChartDataEmpty(chartData);
  const hasNoRuns = runs.length === 0;

  // Per-view anomaly sensitivity (maps to the detector's k multiplier).
  const [sensitivity, setSensitivity] = useState<AnomalySensitivity>("medium");

  // Statistical anomaly detection over the daily crash-rate series.
  // Detection is deliberately run on the day TOTAL across the selected
  // signatures: that is the "crash rate" a maintainer eyeballs for spikes.
  const anomalyResult = useMemo(() => {
    const series = buildDailyRateSeries(chartData, effectiveSelectedSignatures);
    return detectAnomalies(series, { sensitivity });
  }, [chartData, effectiveSelectedSignatures, sensitivity]);

  const totalCrashes = useMemo(
    () => calculateTotalCrashes(chartData),
    [chartData],
  );

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-4 transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              Crash Signature Trends
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Visualize crash signature frequency over time across fuzzing runs.
              Filter by area, severity, and specific signatures to focus on
              trends that matter.
            </p>
          </div>
        </div>

        {/* No data state */}
        {hasNoRuns ? (
          <div className="rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/30 p-12 text-center">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              No fuzzing runs available
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Run fuzzing campaigns to collect crash data for trend analysis.
            </p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="mb-8">
              <FilterBar
                selectedAreas={selectedAreas}
                selectedSeverities={selectedSeverities}
                selectedSignatures={effectiveSelectedSignatures}
                availableAreas={availableAreas}
                availableSignatures={availableSignaturesFiltered}
                onAreasChange={setSelectedAreas}
                onSeveritiesChange={setSelectedSeverities}
                onSignaturesChange={setSelectedSignatures}
              />
            </div>

            {/* Chart */}
            {isEmpty ? (
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-12 text-center">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  No matching crash data
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                  No crashes found for the selected filters. Try adjusting your
                  filter criteria.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Anomaly controls: sensitivity preset for this view */}
                <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <AnomalySensitivityToggle
                    value={sensitivity}
                    onChange={setSensitivity}
                    flagCount={anomalyResult.flags.length}
                  />

                  {/* Cold-start honesty: say what is missing, do not pretend. */}
                  {anomalyResult.coldStart.active && (
                    <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                      {anomalyResult.coldStart.message}
                    </p>
                  )}
                </div>

                <CrashTrendChart
                  data={chartData}
                  selectedSignatures={effectiveSelectedSignatures}
                  anomalyFlags={anomalyResult.flags}
                />

                {/* Summary stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  <StatCard
                    label="Total Days"
                    value={chartData.length.toString()}
                  />
                  <StatCard
                    label="Active Signatures"
                    value={effectiveSelectedSignatures.length.toString()}
                  />
                  <StatCard
                    label="Unique Signatures"
                    value={availableSignatures.length.toString()}
                  />
                  <StatCard
                    label="Total Crashes"
                    value={totalCrashes.toString()}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Display helper: statistics card for summary metrics.
 *
 * Memoized so a parent re-render (e.g. a filter change that only affects
 * one of the four cards) doesn't force the other, unchanged cards to
 * re-render as well.
 */
const StatCard = memo(function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
        {value}
      </p>
    </div>
  );
});

/**
 * Calculate total crashes across all chart data points.
 */
function calculateTotalCrashes(
  chartData: Record<string, string | number>[],
): number {
  let total = 0;
  for (const point of chartData) {
    for (const [key, value] of Object.entries(point)) {
      if (key !== "date" && typeof value === "number") {
        total += value;
      }
    }
  }
  return total;
}
