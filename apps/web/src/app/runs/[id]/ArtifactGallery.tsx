"use client";

/**
 * Artifact Gallery component for run detail page.
 * Issue #1350 & #1349: Handle runs with zero artifacts gracefully.
 */

import type { FuzzingRun } from "../../types";

interface ArtifactGalleryProps {
  run: FuzzingRun;
}

export default function ArtifactGallery({ run }: ArtifactGalleryProps) {
  const artifacts = run.artifacts || [];
  const hasArtifacts = artifacts.length > 0;

  if (!hasArtifacts) {
    return (
      <section className="mb-8 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Artifacts</h2>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="p-3 bg-zinc-100/60 dark:bg-zinc-800/30 rounded-full text-zinc-400 dark:text-zinc-500">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            No artifacts were produced by this run
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            This run may have failed before generating any artifacts
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">
        Artifacts ({artifacts.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {artifacts.map((artifact) => (
          <div
            key={artifact.id}
            className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-medium text-sm truncate">{artifact.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex-shrink-0">
                {artifact.type}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatBytes(artifact.size)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
