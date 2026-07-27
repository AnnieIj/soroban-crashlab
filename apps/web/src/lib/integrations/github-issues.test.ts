import * as assert from 'node:assert/strict';
import {
  parseGithubIssueUrl,
  resolveGithubIssueLink,
  resolveGithubIssueLinkFromUrl,
} from './github-issues';

type FetchImpl = typeof fetch;
const originalFetch: FetchImpl | undefined = (globalThis as { fetch?: FetchImpl }).fetch;

function setFetch(impl: FetchImpl): void {
  (globalThis as { fetch?: FetchImpl }).fetch = impl;
}

function restoreFetch(): void {
  (globalThis as { fetch?: FetchImpl }).fetch = originalFetch;
}

async function run(): Promise<void> {
  // parseGithubIssueUrl
  assert.deepEqual(
    parseGithubIssueUrl('https://github.com/foo/bar/issues/123'),
    { owner: 'foo', repo: 'bar', issueNumber: 123 },
  );
  assert.deepEqual(
    parseGithubIssueUrl('https://github.com/foo/bar/issues/123/'),
    { owner: 'foo', repo: 'bar', issueNumber: 123 },
  );
  assert.deepEqual(
    parseGithubIssueUrl('https://www.github.com/foo/bar/pull/7'),
    { owner: 'foo', repo: 'bar', issueNumber: 7 },
  );
  assert.equal(parseGithubIssueUrl('not a url'), null);
  assert.equal(parseGithubIssueUrl('https://gitlab.com/foo/bar/issues/1'), null);
  assert.equal(parseGithubIssueUrl('https://github.com/foo/bar'), null);
  assert.equal(parseGithubIssueUrl('https://github.com/foo/bar/issues/abc'), null);
  assert.equal(parseGithubIssueUrl('https://github.com/foo/bar/issues/0'), null);

  // resolveGithubIssueLink — successful API response
  setFetch((async () =>
    new Response(JSON.stringify({ title: 'Fix crash in fuzzer', state: 'open' }), {
      status: 200,
    })) as unknown as FetchImpl);

  const success = await resolveGithubIssueLink('foo', 'bar', 42);
  assert.equal(success.url, 'https://github.com/foo/bar/issues/42');
  assert.equal(success.title, 'Fix crash in fuzzer');
  assert.equal(success.state, 'open');
  assert.equal(success.resolved, true);

  // resolveGithubIssueLink — closed issue
  setFetch((async () =>
    new Response(JSON.stringify({ title: 'Old bug', state: 'closed' }), {
      status: 200,
    })) as unknown as FetchImpl);

  const closed = await resolveGithubIssueLink('foo', 'bar', 43);
  assert.equal(closed.state, 'closed');
  assert.equal(closed.resolved, true);

  // resolveGithubIssueLink — 404 falls back gracefully, does not throw
  setFetch((async () => new Response('Not Found', { status: 404 })) as unknown as FetchImpl);

  const notFound = await resolveGithubIssueLink('foo', 'bar', 999);
  assert.equal(notFound.url, 'https://github.com/foo/bar/issues/999');
  assert.equal(notFound.title, '#999');
  assert.equal(notFound.resolved, false);
  assert.equal(notFound.state, undefined);

  // resolveGithubIssueLink — network error falls back gracefully
  setFetch((async () => {
    throw new Error('network down');
  }) as unknown as FetchImpl);

  const networkError = await resolveGithubIssueLink('foo', 'bar', 5);
  assert.equal(networkError.resolved, false);
  assert.equal(networkError.title, '#5');

  // resolveGithubIssueLink — malformed response body falls back gracefully
  setFetch((async () =>
    new Response(JSON.stringify({ notATitle: true }), { status: 200 })) as unknown as FetchImpl);

  const malformed = await resolveGithubIssueLink('foo', 'bar', 6);
  assert.equal(malformed.resolved, false);
  assert.equal(malformed.title, '#6');

  // resolveGithubIssueLinkFromUrl — non-GitHub-issue URL returns null
  const notApplicable = await resolveGithubIssueLinkFromUrl('https://jira.example.com/ISSUE-1');
  assert.equal(notApplicable, null);

  // resolveGithubIssueLinkFromUrl — valid URL resolves end-to-end
  setFetch((async () =>
    new Response(JSON.stringify({ title: 'End to end', state: 'open' }), {
      status: 200,
    })) as unknown as FetchImpl);

  const endToEnd = await resolveGithubIssueLinkFromUrl('https://github.com/foo/bar/issues/1');
  assert.ok(endToEnd);
  assert.equal(endToEnd?.title, 'End to end');

  restoreFetch();
  console.log('github-issues.test.ts: all assertions passed');
}

run().catch((error) => {
  restoreFetch();
  console.error(error);
  process.exitCode = 1;
});
