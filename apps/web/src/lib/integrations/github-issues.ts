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

/**
 * Resolves a GitHub issue to its real title/state via the public REST API.
 * Never throws: on any failure (network error, timeout, 404, rate limit,
 * private repo) it falls back to a placeholder title, matching the
 * previous stub behavior, with `resolved: false` so callers can tell the
 * difference if they need to.
 */
export async function resolveGithubIssueLink(
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<ResolvedIssueLink> {
  const url = canonicalUrl(owner, repo, issueNumber);
  const fallback: ResolvedIssueLink = {
    url,
    title: `#${issueNumber}`,
    resolved: false,
  };

  try {
    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`,
      {
        headers: { Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout?.(8_000),
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
    // Network error, timeout, or unexpected response shape - degrade
    // gracefully rather than surfacing an error to the caller.
    return fallback;
  }
}

/**
 * Convenience wrapper: parses a raw GitHub issue URL and resolves it in one
 * step. Returns null if the URL isn't a GitHub issue link at all (caller
 * should treat that as "not applicable", distinct from a resolution
 * failure which still returns a fallback ResolvedIssueLink).
 */
export async function resolveGithubIssueLinkFromUrl(
  url: string,
): Promise<ResolvedIssueLink | null> {
  const parsed = parseGithubIssueUrl(url);
  if (!parsed) return null;
  return resolveGithubIssueLink(parsed.owner, parsed.repo, parsed.issueNumber);
}


