'use client';

import React, { useState } from 'react';
import type { Report } from './add-report-generator';
import {
  generateShareableReportLink,
  getReportStorageStats,
} from './shareable-report-utils';

interface ShareableReportComponentProps {
  /** The report to share */
  report: Report;
  /** Optional callback when link is generated */
  onLinkGenerated?: (url: string, token: string) => void;
}

export default function ShareableReportComponent({
  report,
  onLinkGenerated,
}: ShareableReportComponentProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareLink, setShareLink] = useState<{ url: string; token: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const linkInfo = generateShareableReportLink(report);
      setShareLink({ url: linkInfo.url, token: linkInfo.token });
      onLinkGenerated?.(linkInfo.url, linkInfo.token);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate shareable link';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (shareLink?.url) {
      navigator.clipboard.writeText(shareLink.url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const stats = getReportStorageStats();

  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
          <svg
            className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C9.589 12.430 10.647 12 11.739 12M19.500 13.5m-7.757-3.243a9 9 0 10-12.986 12.986m12.986-12.986c1.591 1.591 2.757 3.712 3.243 6.005m2.743 7.981c1.591-1.591 2.757-3.712 3.243-6.005M9.242 12.243a3 3 0 106-0.001m0 6a3 3 0 106 0.001"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Share Report</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Generate a shareable link (expires in 7 days)</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {!shareLink ? (
        <button
          onClick={handleGenerateLink}
          disabled={isGenerating}
          className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            isGenerating
              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg hover:shadow-indigo-500/30'
          }`}
        >
          {isGenerating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              Generate Shareable Link
            </>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2 uppercase">Shareable URL</p>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={shareLink.url}
                readOnly
                className="flex-1 px-3 py-2 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 text-xs font-mono text-zinc-700 dark:text-zinc-300"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded font-bold text-xs transition-all ${
                  copied
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/10'
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900 text-center">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{shareLink.token.split('-')[0]}</p>
              <p className="text-zinc-500 dark:text-zinc-400 text-[10px]">Token</p>
            </div>
            <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900 text-center">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">7 days</p>
              <p className="text-zinc-500 dark:text-zinc-400 text-[10px]">Expiration</p>
            </div>
          </div>

          <button
            onClick={() => {
              setShareLink(null);
              setCopied(false);
            }}
            className="w-full py-2 rounded-lg font-bold text-sm border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Generate New Link
          </button>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-semibold">{stats.totalReports}</span> active share{stats.totalReports !== 1 ? 's' : ''},{' '}
          <span className="font-semibold">{stats.totalSizeEstimate}</span> total
        </p>
      </div>
    </div>
  );
}
