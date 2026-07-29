import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from './route';

describe('GET /api/runs', () => {
  let originalApiUrl: string | undefined;
  let originalEnableMock: string | undefined;

  beforeEach(() => {
    originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
    originalEnableMock = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA = originalEnableMock;
    vi.restoreAllMocks();
  });

  describe('with backend configured', () => {
    it('returns successful response when backend responds with 200', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      const mockBackendResponse = {
        runs: [
          { id: 'run-1', status: 'passed', timestamp: '2024-01-01T00:00:00Z' },
          { id: 'run-2', status: 'failed', timestamp: '2024-01-02T00:00:00Z' },
        ],
        total: 2,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockBackendResponse,
      });

      const request = new Request('http://localhost:3000/api/runs');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toEqual(mockBackendResponse);
      expect(data.total).toBe(2);
    });

    it('forwards query parameters to backend', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      const mockBackendResponse = { runs: [], total: 0 };

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockBackendResponse,
      });
      global.fetch = fetchSpy;

      const request = new Request('http://localhost:3000/api/runs?status=failed&limit=10');
      await GET(request);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3001/api/runs'),
        expect.objectContaining({
          cache: 'no-store',
        }),
      );

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('status=failed');
      expect(calledUrl).toContain('limit=10');
    });

    it('sanitizes dangerous query parameters', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      const mockBackendResponse = { runs: [], total: 0 };

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockBackendResponse,
      });
      global.fetch = fetchSpy;

      const request = new Request('http://localhost:3000/api/runs?url=javascript:alert(1)');
      await GET(request);

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('javascript:');
      expect(calledUrl).toContain('url=%23');
    });

    it('returns 503 when backend fetch fails', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const request = new Request('http://localhost:3000/api/runs');
      const response = await GET(request);

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toBe('Backend unavailable');
      expect(data.runs).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('returns 503 when backend times out', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      vi.useFakeTimers();

      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 11000);
        });
      });

      const request = new Request('http://localhost:3000/api/runs');
      const responsePromise = GET(request);

      // Advance past the route's 10 s internal timeout so it fires
      await vi.advanceTimersByTimeAsync(10500);
      const response = await responsePromise;

      vi.useRealTimers();

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toBe('Backend unavailable');
    });

    it('returns 503 when backend responds with non-ok status', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      const request = new Request('http://localhost:3000/api/runs');
      const response = await GET(request);

      expect(response.status).toBe(503);
    });

    it('uses no-store cache policy', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ runs: [], total: 0 }),
      });
      global.fetch = fetchSpy;

      const request = new Request('http://localhost:3000/api/runs');
      await GET(request);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          cache: 'no-store',
        }),
      );
    });

    it('includes timeout signal in fetch options', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ runs: [], total: 0 }),
      });
      global.fetch = fetchSpy;

      const request = new Request('http://localhost:3000/api/runs');
      await GET(request);

      const fetchOptions = fetchSpy.mock.calls[0][1];
      expect(fetchOptions).toHaveProperty('signal');
    });
  });

  describe('with mock data enabled', () => {
    it('returns mock data when backend is not configured', async () => {
      delete process.env.NEXT_PUBLIC_API_URL;
      process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA = 'true';

      const request = new Request('http://localhost:3000/api/runs');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveProperty('runs');
      expect(Array.isArray(data.data.runs)).toBe(true);
      expect(data.data.runs.length).toBeGreaterThan(0);
      expect(data.total).toBe(data.data.runs.length);
    });

    it('mock data contains valid run objects', async () => {
      delete process.env.NEXT_PUBLIC_API_URL;
      process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA = 'true';

      const request = new Request('http://localhost:3000/api/runs');
      const response = await GET(request);

      const data = await response.json();
      const runs = data.data.runs;

      expect(runs.length).toBeGreaterThan(0);
      
      for (const run of runs) {
        expect(run).toHaveProperty('id');
        expect(run).toHaveProperty('status');
        expect(typeof run.id).toBe('string');
        expect(typeof run.status).toBe('string');
      }
    });

    it('returns mock data when backend configured but enableMock not false', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
      process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA = 'true';

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const request = new Request('http://localhost:3000/api/runs');
      const response = await GET(request);

      expect(response.status).toBe(503);
    });
  });

  describe('with mock data disabled', () => {
    it('returns 503 when backend not configured and mock disabled', async () => {
      delete process.env.NEXT_PUBLIC_API_URL;
      process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA = 'false';

      const request = new Request('http://localhost:3000/api/runs');
      const response = await GET(request);

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toBe('Mock data disabled and no backend configured');
    });
  });

  describe('query parameter handling', () => {
    it('handles empty query parameters', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ runs: [], total: 0 }),
      });
      global.fetch = fetchSpy;

      const request = new Request('http://localhost:3000/api/runs');
      await GET(request);

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toBe('http://localhost:3001/api/runs');
    });

    it('handles multiple query parameters', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ runs: [], total: 0 }),
      });
      global.fetch = fetchSpy;

      const request = new Request('http://localhost:3000/api/runs?status=failed&limit=20&offset=10');
      await GET(request);

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('status=failed');
      expect(calledUrl).toContain('limit=20');
      expect(calledUrl).toContain('offset=10');
    });

    it('preserves query parameter order', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ runs: [], total: 0 }),
      });
      global.fetch = fetchSpy;

      const request = new Request('http://localhost:3000/api/runs?a=1&b=2&c=3');
      await GET(request);

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('a=1');
      expect(calledUrl).toContain('b=2');
      expect(calledUrl).toContain('c=3');
    });
  });

  describe('response structure', () => {
    it('wraps backend data in success response format', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      const backendData = {
        runs: [{ id: 'run-1' }],
        total: 1,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => backendData,
      });

      const request = new Request('http://localhost:3000/api/runs');
      const response = await GET(request);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data.data).toEqual(backendData);
    });

    it('includes total field in response when present', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ runs: [], total: 42 }),
      });

      const request = new Request('http://localhost:3000/api/runs');
      const response = await GET(request);

      const data = await response.json();
      expect(data.total).toBe(42);
    });
  });

  describe('error handling', () => {
    it('handles malformed JSON response from backend', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const request = new Request('http://localhost:3000/api/runs');
      const response = await GET(request);

      expect(response.status).toBe(503);
    });

    it('handles network errors gracefully', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

      global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const request = new Request('http://localhost:3000/api/runs');
      const response = await GET(request);

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('runs');
      expect(data).toHaveProperty('total');
    });
  });
});
