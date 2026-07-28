"use client";

import { useState } from "react";
import {
  generateRegressionSuite,
  calculateSuiteStats,
  groupTestsByCategory,
  formatDuration,
  type RegressionSuite,
  type RegressionTestStatus,
} from "../regression-suite-utils";

export default function RegressionSuitePage() {
  const [suite] = useState<RegressionSuite>(() =>
    generateRegressionSuite("suite-1", "Core Contract Regression Suite"),
  );
  const stats = calculateSuiteStats(suite);
  const groupedTests = groupTestsByCategory(suite.tests);

  const getStatusIcon = (status: RegressionTestStatus) => {
    switch (status) {
      case "pass":
        return "✓";
      case "fail":
        return "✕";
      case "skip":
        return "⊘";
      case "running":
        return "◷";
    }
  };

  const getStatusColor = (status: RegressionTestStatus) => {
    switch (status) {
      case "pass":
        return "text-green-600 dark:text-green-400";
      case "fail":
        return "text-red-600 dark:text-red-400";
      case "skip":
        return "text-zinc-500 dark:text-zinc-400";
      case "running":
        return "text-blue-600 dark:text-blue-400";
    }
  };

  const getStatusBg = (status: RegressionTestStatus) => {
    switch (status) {
      case "pass":
        return "bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700";
      case "fail":
        return "bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700";
      case "skip":
        return "bg-zinc-100 dark:bg-zinc-800/20 border-zinc-300 dark:border-zinc-700";
      case "running":
        return "bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">
            {suite.name}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Suite ID: {suite.id} • Started:{" "}
            {new Date(suite.startedAt).toLocaleString()}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-[var(--surface)] border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.total}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Total
            </div>
          </div>
          <div className="bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {stats.passed}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">
              Passed
            </div>
          </div>
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
              {stats.failed}
            </div>
            <div className="text-xs text-red-600 dark:text-red-400">Failed</div>
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-800/20 border border-zinc-300 dark:border-zinc-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-zinc-700 dark:text-zinc-300">
              {stats.skipped}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              Skipped
            </div>
          </div>
          <div className="bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {stats.passRate.toFixed(1)}%
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">
              Pass Rate
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Overall Progress
            </span>
          </div>
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden flex">
            <div
              className="bg-green-500 dark:bg-green-600"
              style={{ width: `${(stats.passed / stats.total) * 100}%` }}
            />
            <div
              className="bg-red-500 dark:bg-red-600"
              style={{ width: `${(stats.failed / stats.total) * 100}%` }}
            />
            <div
              className="bg-zinc-400 dark:bg-zinc-500"
              style={{ width: `${(stats.skipped / stats.total) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedTests).map(([category, tests]) => (
            <div
              key={category}
              className="bg-[var(--surface)] border border-zinc-200 dark:border-zinc-700 rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100 capitalize">
                {category} Tests ({tests.length})
              </h2>
              <div className="space-y-3">
                {tests.map((test) => (
                  <div
                    key={test.id}
                    className={`border rounded-lg p-4 ${getStatusBg(test.status)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`text-2xl ${getStatusColor(test.status)} flex-shrink-0`}
                      >
                        {getStatusIcon(test.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-1">
                          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {test.name}
                          </h3>
                          {test.duration && (
                            <span className="text-sm text-zinc-600 dark:text-zinc-400 flex-shrink-0">
                              {formatDuration(test.duration)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                          {test.description}
                        </p>
                        {test.errorMessage && (
                          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded p-2 mt-2">
                            <p className="text-sm text-red-800 dark:text-red-300 font-mono">
                              {test.errorMessage}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
