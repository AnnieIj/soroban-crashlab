/**
 * GET /api/integrations/jira/:issueKey
 *
 * Fetches Jira issue metadata for the specified issue key.
 * Returns 404 if the issue is not found or credentials are not configured.
 */

import { NextResponse } from 'next/server';
import { withRouteErrorHandling, jsonError } from '@/lib/route-handler';
import { fetchJiraIssue } from '@/lib/integrations/jira-issues';

interface RouteContext {
  params: Promise<{ issueKey: string }>;
}

export const GET = withRouteErrorHandling(
  'GET /api/integrations/jira/[issueKey]',
  async (_request: Request, context: RouteContext) => {
    const { issueKey } = await context.params;

    if (!issueKey || issueKey.trim() === '') {
      return jsonError('Issue key is required', 400);
    }

    const issue = await fetchJiraIssue(issueKey);

    if (!issue) {
      return jsonError('Issue not found or Jira not configured', 404);
    }

    return NextResponse.json({ issue });
  },
  'Failed to fetch Jira issue',
);
