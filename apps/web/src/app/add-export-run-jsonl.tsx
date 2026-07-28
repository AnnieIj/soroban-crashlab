'use client';

import React, { useState } from 'react';
import type { FuzzingRun } from './types';

type ExportRunJsonLProps = {
  runs: FuzzingRun[];
};

export default function AddExportRunJsonL({ runs }: ExportRunJsonLProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    
    // Simulate slight delay for UX
    setTimeout(() => {
      try {
        // Convert runs to JSON Lines format (one JSON object per line)
        const jsonLines = runs.map(run => JSON.stringify(run)).join('\n');
        const blob = new Blob([jsonLines], { type: 'application/x-jsonlines' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `soroban-runs-export-${new Date().toISOString().split('T')[0]}.jsonl`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('JSON Lines Export failed:', error);
      } finally {
        setIsExporting(false);
      }
    }, 700);
  };

  return (
    <div className="group relative overflow-hidden rounded-[2rem] border border-violet-200 bg-violet-50/50 p-8 shadow-sm transition-all hover:shadow-md dark:border-violet-900/30 dark:bg-violet-950/20">
      <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl transition-transform group-hover:scale-150" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Export as JSON Lines</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Download newline-delimited JSON for streaming and processing.</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Format</span>
            <span className="text-2xl font-black text-violet-600 dark:text-violet-400">JSONL</span>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`relative flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 ${
              isExporting 
                ? 'bg-zinc-200 text-zinc-500 cursor-not-allowed dark:bg-zinc-800' 
                : 'bg-violet-600 text-white hover:bg-violet-700 hover:shadow-xl hover:shadow-violet-500/30'
            }`}
          >
            {isExporting ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <span>Download JSONL</span>
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
