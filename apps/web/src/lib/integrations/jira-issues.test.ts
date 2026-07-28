/**
 * Tests for Jira issues integration
 */

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { resolveJiraIssueLink, fetchJiraIssue, createJiraIssue } from './jira-issues';
import { logger } from '../logger';

// Mock the logger
vi.mock('../logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('resolveJiraIssueLink', () => {
  it('builds correct URL from base URL and issue key', async () => {
    const result = await resolveJiraIssueLink('https://jira.example.com', 'PROJ-123');

    expect(result.url).toBe('https://jira.example.com/browse/PROJ-123');
    expect(result.key).toBe('PROJ-123');
  });

  it('handles base URL with trailing slash', async () => {
    const result = await resolveJiraIssueLink('https://jira.example.com/', 'PROJ-123');

    expect(result.url).toBe('https://jira.example.com/browse/PROJ-123');
  });
});

describe('createJiraIssue', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates a Jira issue when credentials are configured', async () => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    process.env.JIRA_EMAIL = 'test@example.com';
    process.env.JIRA_API_TOKEN = 'token123';
    process.env.JIRA_PROJECT_KEY = 'CRASH';

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          key: 'CRASH-123',
          fields: {
            summary: 'Crash report for contract execution',
            status: { name: 'To Do' },
            assignee: null,
          },
        }),
      } as Response),
    );

    const result = await createJiraIssue({
      summary: 'Crash report for contract execution',
      description: 'This issue was created from a crash report.',
    });

    expect(result).toEqual({
      key: 'CRASH-123',
      summary: 'Crash report for contract execution',
      status: 'To Do',
      assignee: null,
      url: 'https://jira.example.com/browse/CRASH-123',
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://jira.example.com/rest/api/3/issue',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
        }),
      }),
    );
  });

  it('returns null when Jira credentials are not configured', async () => {
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_API_TOKEN;

    const result = await createJiraIssue({ summary: 'Crash report' });

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith('Jira credentials not configured', { issueKey: undefined });
  });
});

describe('fetchJiraIssue', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns null when credentials are not configured', async () => {
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_API_TOKEN;

    const result = await fetchJiraIssue('PROJ-123');

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith('Jira credentials not configured', { issueKey: 'PROJ-123' });
  });

  it('returns structured issue data for successful API call', async () => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    process.env.JIRA_EMAIL = 'test@example.com';
    process.env.JIRA_API_TOKEN = 'token123';

    const mockResponse = {
      key: 'PROJ-123',
      fields: {
        summary: 'Test issue summary',
        status: { name: 'In Progress' },
        assignee: { emailAddress: 'assignee@example.com' },
      },
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      } as Response),
    );

    const result = await fetchJiraIssue('PROJ-123');

    expect(result).toEqual({
      key: 'PROJ-123',
      summary: 'Test issue summary',
      status: 'In Progress',
      assignee: 'assignee@example.com',
      url: 'https://jira.example.com/browse/PROJ-123',
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://jira.example.com/rest/api/3/issue/PROJ-123',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': expect.stringMatching(/^Basic /),
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('returns null for 404 response', async () => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    process.env.JIRA_EMAIL = 'test@example.com';
    process.env.JIRA_API_TOKEN = 'token123';

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
      } as Response),
    );

    const result = await fetchJiraIssue('NONEXISTENT-999');

    expect(result).toBeNull();
    expect(logger.info).toHaveBeenCalledWith('Jira issue not found', { issueKey: 'NONEXISTENT-999' });
  });

  it('throws error for non-404 API errors', async () => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    process.env.JIRA_EMAIL = 'test@example.com';
    process.env.JIRA_API_TOKEN = 'token123';

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      } as Response),
    );

    await expect(fetchJiraIssue('PROJ-123')).rejects.toThrow('Jira API returned 401');
    expect(logger.error).toHaveBeenCalledWith('Jira API error', expect.any(Object));
  });

  it('throws error when fetch fails', async () => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    process.env.JIRA_EMAIL = 'test@example.com';
    process.env.JIRA_API_TOKEN = 'token123';

    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    await expect(fetchJiraIssue('PROJ-123')).rejects.toThrow('Network error');
    expect(logger.error).toHaveBeenCalledWith('Failed to fetch Jira issue', expect.any(Object));
  });

  it('handles missing fields in API response', async () => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    process.env.JIRA_EMAIL = 'test@example.com';
    process.env.JIRA_API_TOKEN = 'token123';

    const mockResponse = {
      key: 'PROJ-123',
      fields: {},
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      } as Response),
    );

    const result = await fetchJiraIssue('PROJ-123');

    expect(result).toEqual({
      key: 'PROJ-123',
      summary: 'No summary available',
      status: 'Unknown',
      assignee: null,
      url: 'https://jira.example.com/browse/PROJ-123',
    });
  });

  it('uses assignee displayName when emailAddress is not available', async () => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    process.env.JIRA_EMAIL = 'test@example.com';
    process.env.JIRA_API_TOKEN = 'token123';

    const mockResponse = {
      key: 'PROJ-123',
      fields: {
        summary: 'Test',
        status: { name: 'Open' },
        assignee: { displayName: 'John Doe' },
      },
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      } as Response),
    );

    const result = await fetchJiraIssue('PROJ-123');

    expect(result?.assignee).toBe('John Doe');
  });
});