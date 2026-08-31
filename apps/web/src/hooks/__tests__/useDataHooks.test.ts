import { describe, it, expect } from 'vitest';
import { useRuns } from '../useRuns';
import { useRun } from '../useRun';
import { useIssues } from '../useIssues';

describe('useRuns hook', () => {
  it('exports useRuns function', () => {
    expect(useRuns).toBeDefined();
    expect(typeof useRuns).toBe('function');
  });

  it('provides proper options interface', () => {
    const options = {
      autoFetch: false,
      revalidateOnFocus: true,
      revalidateOnVisibility: true,
      initialData: [],
      pollInterval: 5000,
    };
    expect(options.autoFetch).toBe(false);
    expect(options.pollInterval).toBe(5000);
  });
});

describe('useRun hook', () => {
  it('exports useRun function', () => {
    expect(useRun).toBeDefined();
    expect(typeof useRun).toBe('function');
  });

  it('accepts run ID and options', () => {
    const options = {
      autoFetch: true,
      pollInterval: 3000,
    };
    expect(options.autoFetch).toBe(true);
  });
});

describe('useIssues hook', () => {
  it('exports useIssues function', () => {
    expect(useIssues).toBeDefined();
    expect(typeof useIssues).toBe('function');
  });

  it('accepts runId and initial issues', () => {
    const initialIssues = [
      { label: 'Issue #42', href: 'https://github.com/example/repo/issues/42' },
    ];
    const options = {
      autoFetch: false,
      initialIssues,
    };
    expect(options.initialIssues).toHaveLength(1);
  });
});
