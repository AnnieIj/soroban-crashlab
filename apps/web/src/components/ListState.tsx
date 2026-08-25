import React from 'react';
import { GenericPageSkeleton } from './LoadingSkeleton';

export type ListStateProps =
  | { state: 'loading'; skeleton?: React.ReactNode }
  | { state: 'error'; message?: React.ReactNode; onRetry?: () => void }
  | { state: 'empty'; message?: React.ReactNode; action?: React.ReactNode }
  | { state: 'success'; children: React.ReactNode };

export function ListState(props: ListStateProps) {
  switch (props.state) {
    case 'loading':
      return (
        <div role="status" aria-live="polite" className="fade-in">
          {props.skeleton ? props.skeleton : <GenericPageSkeleton variant="table" rows={5} />}
        </div>
      );
    case 'error':
      return (
        <div role="alert" className="card card-padding text-center py-8 sm:py-12 fade-in" style={{ borderLeft: '4px solid #CC1016' }}>
          <span className="text-2xl sm:text-3xl mb-2 sm:mb-3 block">⚠</span>
          <p className="font-semibold" style={{ color: '#CC1016' }}>
            {props.message || 'An error occurred while loading data.'}
          </p>
          {props.onRetry && (
            <div className="mt-3 sm:mt-4">
              <button type="button" onClick={props.onRetry} className="btn-primary text-xs sm:text-sm">
                Retry
              </button>
            </div>
          )}
        </div>
      );
    case 'empty':
      return (
        <div className="card card-padding text-center py-16 fade-in border border-zinc-200 dark:border-zinc-800">
          {/* TODO(Issue #1209): Integrate empty-state illustrations here */}
          <p className="text-meta">{props.message || 'No items found.'}</p>
          {props.action && <div className="mt-4">{props.action}</div>}
        </div>
      );
    case 'success':
      return <>{props.children}</>;
    default:
      // Type-level coverage assertion proving compile-time exhaustiveness enforcement.
      const _exhaustiveCheck: never = props;
      return _exhaustiveCheck;
  }
}
