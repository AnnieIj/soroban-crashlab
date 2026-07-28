/**
 * Tests for Jira issue API route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import * as jiraIssues from '@/lib/integrations/jira-issues';

vi.mock('@/lib/integrations/jira-issues');

describe('POST /api/integrations/jira', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 for missing summary', async () => {
    const request = new Request('http://localhost/api/integrations/jira', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Body only' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('summary');
  });

  it('returns 200 with created issue data', async () => {
    const mockIssue = {
      key: 'CRASH-123',
      summary: 'Crash report issue',
      status: 'To Do',
      assignee: null,
      url: 'https://jira.example.com/browse/CRASH-123',
    };

    vi.mocked(jiraIssues.createJiraIssue).mockResolvedValue(mockIssue);

    const request = new Request('http://localhost/api/integrations/jira', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: 'Crash report issue', description: 'details' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.issue).toEqual(mockIssue);
    expect(jiraIssues.createJiraIssue).toHaveBeenCalledWith({
      summary: 'Crash report issue',
      description: 'details',
      projectKey: undefined,
      issueType: undefined,
    });
  });
});

describe('GET /api/integrations/jira/[issueKey]', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 for empty issue key', async () => {
    const request = new Request('http://localhost/api/integrations/jira/');
    const context = { params: Promise.resolve({ issueKey: '' }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('returns 200 with issue data when issue is found', async () => {
    const mockIssue = {
      key: 'PROJ-123',
      summary: 'Test issue',
      status: 'In Progress',
      assignee: 'test@example.com',
      url: 'https://jira.example.com/browse/PROJ-123',
    };

    vi.mocked(jiraIssues.fetchJiraIssue).mockResolvedValue(mockIssue);

    const request = new Request('http://localhost/api/integrations/jira/PROJ-123');
    const context = { params: Promise.resolve({ issueKey: 'PROJ-123' }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.issue).toEqual(mockIssue);
    expect(jiraIssues.fetchJiraIssue).toHaveBeenCalledWith('PROJ-123');
  });

  it('returns 404 when issue is not found', async () => {
    vi.mocked(jiraIssues.fetchJiraIssue).mockResolvedValue(null);

    const request = new Request('http://localhost/api/integrations/jira/NONEXISTENT-999');
    const context = { params: Promise.resolve({ issueKey: 'NONEXISTENT-999' }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('returns 500 when fetchJiraIssue throws error', async () => {
    vi.mocked(jiraIssues.fetchJiraIssue).mockRejectedValue(new Error('API Error'));

    const request = new Request('http://localhost/api/integrations/jira/PROJ-123');
    const context = { params: Promise.resolve({ issueKey: 'PROJ-123' }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to fetch Jira issue');
  });

  it('handles issue key with special characters', async () => {
    const mockIssue = {
      key: 'PROJ-123',
      summary: 'Test',
      status: 'Open',
      assignee: null,
      url: 'https://jira.example.com/browse/PROJ-123',
    };

    vi.mocked(jiraIssues.fetchJiraIssue).mockResolvedValue(mockIssue);

    const request = new Request('http://localhost/api/integrations/jira/PROJ-123');
    const context = { params: Promise.resolve({ issueKey: 'PROJ-123' }) };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.issue.key).toBe('PROJ-123');
  });
});