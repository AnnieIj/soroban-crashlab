/**
 * Linear Issue Link Adapter
 *
 * Resolves Linear issue links and fetches issue metadata from Linear GraphQL API.
 * When credentials are not configured, falls back to building a canonical link.
 */

import { logger } from '../logger';

export interface ResolvedLinearLink {
  url: string;
  id: string;
}

export interface LinearIssue {
  identifier: string;
  title: string;
  state: string;
  assignee: string | null;
  url: string;
}

/**
 * Builds a canonical Linear issue link without calling the API
 */
export async function resolveLinearIssueLink(team: string, issueId: string): Promise<ResolvedLinearLink> {
  return { url: `https://linear.app/${team}/issue/${issueId}`, id: issueId };
}

/**
 * Fetches full issue metadata from Linear GraphQL API
 */
export async function fetchLinearIssue(issueId: string): Promise<LinearIssue | null> {
  const apiKey = process.env.LINEAR_API_KEY;

  if (!apiKey) {
    logger.warn('Linear API key not configured', { issueId });
    return null;
  }

  const apiUrl = 'https://api.linear.app/graphql';

  const query = `
    query($issueId: String!) {
      issue(id: $issueId) {
        identifier
        title
        state {
          name
        }
        assignee {
          email
        }
        url
      }
    }
  `;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { issueId },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Linear API error', { 
        issueId, 
        status: response.status, 
        error: errorText 
      });
      throw new Error(`Linear API returned ${response.status}`);
    }

    const data = await response.json();

    // Check for GraphQL errors
    if (data.errors && data.errors.length > 0) {
      logger.error('Linear GraphQL errors', { 
        issueId, 
        errors: data.errors 
      });
      throw new Error(`Linear GraphQL error: ${data.errors[0].message}`);
    }

    // Check if issue was found
    if (!data.data || !data.data.issue) {
      logger.info('Linear issue not found', { issueId });
      return null;
    }

    const issue = data.data.issue;

    return {
      identifier: issue.identifier,
      title: issue.title || 'No title available',
      state: issue.state?.name || 'Unknown',
      assignee: issue.assignee?.email || null,
      url: issue.url,
    };
  } catch (error) {
    logger.error('Failed to fetch Linear issue', { 
      issueId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}


