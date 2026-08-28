'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildEmbedSnippet,
  buildShareUrl,
  checkUrlLength,
  decodeViewState,
  encodeViewState,
  type ViewState,
} from './view-state';
import {
  addView,
  createLocalSavedViewGateway,
  createSavedView,
  deleteView,
  renameView,
  validateViewName,
  type SavedView,
} from './view-store';

interface SavedViewsMenuProps {
  state: ViewState;
  onApply: (state: ViewState) => void;
  /** Path the share link points at. */
  path?: string;
}

const EMBED_HEIGHT_OPTIONS = [400, 600, 800];

export default function SavedViewsMenu({ state, onApply, path = '/runs' }: SavedViewsMenuProps) {
  const gateway = useMemo(() => createLocalSavedViewGateway(), []);
  // Everything below reads localStorage or window.location, so nothing renders
  // until after mount — the server HTML and the first client paint match.
  const [mounted, setMounted] = useState(false);
  const [views, setViews] = useState<SavedView[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [embedHeight, setEmbedHeight] = useState(EMBED_HEIGHT_OPTIONS[1]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
      setViews(gateway.list());
    });
  }, [gateway]);

  const persist = useCallback(
    (next: SavedView[]) => {
      setViews(next);
      try {
        gateway.save(next);
      } catch {
        setNameError('Could not save — browser storage is unavailable.');
      }
    },
    [gateway],
  );

  const shareUrl = mounted ? buildShareUrl(window.location.origin, path, state) : '';
  const lengthCheck = checkUrlLength(shareUrl);

  const handleSave = () => {
    const error = validateViewName(draftName, views);
    if (error) {
      setNameError(error);
      return;
    }
    setNameError(null);
    persist(addView(views, createSavedView(draftName, state, new Date().toISOString())));
    setDraftName('');
  };

  const handleRename = (view: SavedView) => {
    const next = window.prompt('Rename view', view.name);
    if (next === null) return;
    persist(renameView(views, view.id, next, new Date().toISOString()));
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  if (!mounted) {
    // Placeholder keeps the toolbar from shifting when the menu appears.
    return <div className="h-8 w-[13.5rem]" aria-hidden />;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          className="btn-outline text-xs sm:text-sm px-3 h-8 sm:h-10"
        >
          Views ({views.length})
        </button>

        {menuOpen && (
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex gap-2">
              <label htmlFor="view-name" className="sr-only">
                View name
              </label>
              <input
                id="view-name"
                value={draftName}
                onChange={(event) => {
                  setDraftName(event.target.value);
                  setNameError(null);
                }}
                placeholder="Name this view…"
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-[#0A66C2] px-3 py-1.5 text-sm font-semibold text-white"
              >
                Save
              </button>
            </div>
            {nameError && (
              <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                {nameError}
              </p>
            )}

            <ul className="mt-3 space-y-1">
              {views.length === 0 && (
                <li className="text-meta text-xs">No saved views yet.</li>
              )}
              {views.map((view) => (
                <li key={view.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onApply(decodeViewState(view.encoded));
                      setMenuOpen(false);
                    }}
                    className="flex-1 truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {view.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRename(view)}
                    className="text-xs text-meta underline"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => persist(deleteView(views, view.id))}
                    className="text-xs text-rose-600 underline dark:text-rose-400"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShareOpen(true)}
        className="btn-outline text-xs sm:text-sm px-3 h-8 sm:h-10"
      >
        Share
      </button>

      {shareOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Share this view"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShareOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Share this view</h2>
            <p className="text-meta mt-1 text-sm">
              The link carries the full view state — filters, sort, columns and search.
            </p>

            {lengthCheck.tooLong && (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              >
                {lengthCheck.message}
              </p>
            )}

            <label htmlFor="share-url" className="mt-4 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Link ({lengthCheck.length} characters)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="share-url"
                readOnly
                value={shareUrl}
                className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button
                type="button"
                onClick={() => void copy(shareUrl, 'link')}
                className="rounded-lg bg-[#0A66C2] px-3 py-2 text-sm font-semibold text-white"
              >
                {copied === 'link' ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <label htmlFor="embed-height" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Embed height
              </label>
              <select
                id="embed-height"
                value={embedHeight}
                onChange={(event) => setEmbedHeight(Number(event.target.value))}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
              >
                {EMBED_HEIGHT_OPTIONS.map((height) => (
                  <option key={height} value={height}>
                    {height}px
                  </option>
                ))}
              </select>
            </div>

            <textarea
              readOnly
              rows={3}
              aria-label="Embed snippet"
              value={buildEmbedSnippet(shareUrl, embedHeight)}
              className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-50 p-2 font-mono text-[11px] dark:border-zinc-700 dark:bg-zinc-950"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => void copy(buildEmbedSnippet(shareUrl, embedHeight), 'embed')}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold dark:border-zinc-700"
              >
                {copied === 'embed' ? 'Copied' : 'Copy embed'}
              </button>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Done
              </button>
            </div>

            <p className="mt-3 font-mono text-[10px] text-zinc-400">
              state: {encodeViewState(state)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
