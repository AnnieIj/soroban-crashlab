'use client';

import React from 'react';

export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
  note?: string;
}

export interface IngredientListProps {
  ingredients?: Ingredient[];
  dataState?: 'loading' | 'error' | 'success';
  onRetry?: () => void;
  errorMessage?: string;
}

const LOADING_ITEMS = 4;

function IngredientRow({ name, amount, unit, note }: Ingredient) {
  return (
    <li className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex-1">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{name}</p>
        {note ? <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{note}</p> : null}
      </div>
      <div className="text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {amount}
        {unit ? <span className="text-zinc-500 dark:text-zinc-400 ml-1">{unit}</span> : null}
      </div>
    </li>
  );
}

function IngredientSkeleton({ index }: { index: number }) {
  return (
    <li key={index} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950" aria-hidden="true">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-3 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="h-4 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </li>
  );
}

function IngredientError({ onRetry, errorMessage }: { onRetry?: () => void; errorMessage?: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50/60 p-6 shadow-sm dark:border-red-900/50 dark:bg-red-950/20" role="alert">
      <h2 className="text-xl font-bold text-red-900 dark:text-red-100">Ingredient List</h2>
      <p className="mt-2 text-sm text-red-700 dark:text-red-300">
        {errorMessage ?? 'Ingredients are unavailable. Retry to refresh the list.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          Retry ingredient list
        </button>
      )}
    </div>
  );
}

export function IngredientList({ ingredients = [], dataState = 'success', onRetry, errorMessage }: IngredientListProps) {
  const normalized = ingredients.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    amount: ingredient.amount,
    unit: ingredient.unit,
    note: ingredient.note,
  }));

  if (dataState === 'loading') {
    return (
      <section aria-busy="true" aria-label="Ingredient list loading" className="w-full space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="h-8 w-48 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <ul className="space-y-3">
          {Array.from({ length: LOADING_ITEMS }, (_, i) => (
            <IngredientSkeleton key={i} index={i} />
          ))}
        </ul>
      </section>
    );
  }

  if (dataState === 'error') {
    return <IngredientError onRetry={onRetry} errorMessage={errorMessage} />;
  }

  if (normalized.length === 0) {
    return (
      <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Ingredients</h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-full text-zinc-300 mb-4">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No ingredients yet</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Add ingredients to see them listed here.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950" aria-label="Ingredient list">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Ingredients</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{normalized.length} item{normalized.length === 1 ? '' : 's'} ready to use.</p>
      </div>
      <ul className="space-y-3">
        {normalized.map((ingredient) => (
          <IngredientRow key={ingredient.id} {...ingredient} />
        ))}
      </ul>
    </section>
  );
}

export default IngredientList;
