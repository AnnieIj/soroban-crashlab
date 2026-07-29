/**
 * GitHub Issue Link Adapter
 *
 * Small, dependency-free helper that resolves a GitHub issue link for use
 * in the UI. Works without a token, using GitHub's public REST API for
 * unauthenticated reads of public repositories. If the API is unreachable,
 * rate-limited, or the issue/repo can't be found, this falls back to a
 * canonical URL with a placeholder title rather than throwing - the caller
 * should never have to handle an exception from this module.
 */

import { createAbortSignal } from './adapter-utils';

export interface ResolvedIssueLink {
  url: string;
  title?: string;
  state?: 'open' | 'closed';
  resolved: boolean;
}

export interface ParsedGithubIssueUrl {
  owner: string;
  repo: string;
  issueNumber: number;
}

/**
 * Parses a GitHub issue (or pull request) URL into its owner/repo/number
 * parts. Returns null if the URL isn't a recognizable GitHub issue link.
 */
export function parseGithubIssueUrl(url: string): ParsedGithubIssueUrl | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') {
    return null;
  }

  const match = parsed.pathname.match(
    /^\/([^/]+)\/([^/]+)\/(?:issues|pull)\/(\d+)\/?$/,
  );
  if (!match) return null;

  const [, owner, repo, issueNumberStr] = match;
  const issueNumber = Number.parseInt(issueNumberStr, 10);
  if (!Number.isFinite(issueNumber) || issueNumber <= 0) return null;

  return { owner, repo, issueNumber };
}

function canonicalUrl(owner: string, repo: string, issueNumber: number): string {
  return `https://github.com/${owner}/${repo}/issues/${issueNumber}`;
}

export interface GithubIssuesAdapterOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

async function resolveIssueLinkImpl(
  owner: string,
  repo: string,
  issueNumber: number,
  fetchImpl: typeof fetch,
  signal: AbortSignal | undefined,
): Promise<ResolvedIssueLink> {
  const url = canonicalUrl(owner, repo, issueNumber);
  const fallback: ResolvedIssueLink = {
    url,
    title: `#${issueNumber}`,
    resolved: false,
  };

  try {
    const response = await fetchImpl(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`,
      {
        headers: { Accept: 'application/vnd.github+json' },
        signal,
      },
    );

    if (!response.ok) {
      return fallback;
    }

    const data = (await response.json()) as { title?: unknown; state?: unknown };
    if (typeof data.title !== 'string' || !data.title) {
      return fallback;
    }

    return {
      url,
      title: data.title,
      state: data.state === 'closed' ? 'closed' : 'open',
      resolved: true,
    };
  } catch {
    return fallback;
  }
}

export function createGithubIssuesAdapter(options: GithubIssuesAdapterOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const signal = createAbortSignal(options.timeoutMs);

  return {
    async resolveIssueLink(
      owner: string,
      repo: string,
      issueNumber: number,
    ): Promise<ResolvedIssueLink> {
      return resolveIssueLinkImpl(owner, repo, issueNumber, fetchImpl, signal);
    },

    async resolveIssueLinkFromUrl(
      url: string,
    ): Promise<ResolvedIssueLink | null> {
      const parsed = parseGithubIssueUrl(url);
      if (!parsed) return null;
      return resolveIssueLinkImpl(parsed.owner, parsed.repo, parsed.issueNumber, fetchImpl, signal);
    },
  };
}


