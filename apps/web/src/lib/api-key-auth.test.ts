import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  getConfiguredApiKey,
  extractBearerToken,
  timingSafeStringEqual,
  validateWebhookApiKey,
} from './api-key-auth';

// ─── helpers ───────────────────────────────────────────────────────────────

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/webhooks', { headers });
}

// ─── getConfiguredApiKey ───────────────────────────────────────────────────

describe('getConfiguredApiKey', () => {
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.CRASHLAB_WEBHOOK_API_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.CRASHLAB_WEBHOOK_API_KEY;
    } else {
      process.env.CRASHLAB_WEBHOOK_API_KEY = originalKey;
    }
  });

  it('returns undefined when the env var is not set', () => {
    delete process.env.CRASHLAB_WEBHOOK_API_KEY;
    expect(getConfiguredApiKey()).toBeUndefined();
  });

  it('returns undefined when the env var is an empty string', () => {
    process.env.CRASHLAB_WEBHOOK_API_KEY = '';
    expect(getConfiguredApiKey()).toBeUndefined();
  });

  it('returns undefined when the env var is only whitespace', () => {
    process.env.CRASHLAB_WEBHOOK_API_KEY = '   ';
    expect(getConfiguredApiKey()).toBeUndefined();
  });

  it('returns the trimmed value when the env var is set', () => {
    process.env.CRASHLAB_WEBHOOK_API_KEY = 'super-secret-key';
    expect(getConfiguredApiKey()).toBe('super-secret-key');
  });

  it('trims surrounding whitespace from the env var value', () => {
    process.env.CRASHLAB_WEBHOOK_API_KEY = '  secret  ';
    expect(getConfiguredApiKey()).toBe('secret');
  });
});

// ─── extractBearerToken ────────────────────────────────────────────────────

describe('extractBearerToken', () => {
  it('returns undefined when no Authorization header is present', () => {
    expect(extractBearerToken(makeRequest())).toBeUndefined();
  });

  it('returns undefined for a Basic auth header', () => {
    expect(
      extractBearerToken(makeRequest({ authorization: 'Basic dXNlcjpwYXNz' })),
    ).toBeUndefined();
  });

  it('returns undefined for a malformed header with too many parts', () => {
    expect(
      extractBearerToken(makeRequest({ authorization: 'Bearer token extra' })),
    ).toBeUndefined();
  });

  it('returns undefined when the token part is empty', () => {
    expect(extractBearerToken(makeRequest({ authorization: 'Bearer ' }))).toBeUndefined();
  });

  it('returns the token for a well-formed Bearer header', () => {
    expect(
      extractBearerToken(makeRequest({ authorization: 'Bearer my-api-key' })),
    ).toBe('my-api-key');
  });

  it('is case-insensitive for the "Bearer" scheme', () => {
    expect(
      extractBearerToken(makeRequest({ authorization: 'BEARER my-api-key' })),
    ).toBe('my-api-key');
    expect(
      extractBearerToken(makeRequest({ authorization: 'bearer my-api-key' })),
    ).toBe('my-api-key');
  });
});

// ─── timingSafeStringEqual ─────────────────────────────────────────────────

describe('timingSafeStringEqual', () => {
  it('returns true for two identical strings', () => {
    expect(timingSafeStringEqual('abc', 'abc')).toBe(true);
  });

  it('returns false for strings that differ by one character', () => {
    expect(timingSafeStringEqual('abcd', 'abce')).toBe(false);
  });

  it('returns false for strings with different lengths', () => {
    expect(timingSafeStringEqual('short', 'longer-value')).toBe(false);
  });

  it('returns false when one string is empty and the other is not', () => {
    expect(timingSafeStringEqual('', 'nonempty')).toBe(false);
    expect(timingSafeStringEqual('nonempty', '')).toBe(false);
  });

  it('returns true for two empty strings', () => {
    expect(timingSafeStringEqual('', '')).toBe(true);
  });

  it('handles strings with special characters', () => {
    const key = 'sk_live_abc123!@#$%^&*()';
    expect(timingSafeStringEqual(key, key)).toBe(true);
    expect(timingSafeStringEqual(key, key + '!')).toBe(false);
  });
});

// ─── validateWebhookApiKey ─────────────────────────────────────────────────

describe('validateWebhookApiKey', () => {
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.CRASHLAB_WEBHOOK_API_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.CRASHLAB_WEBHOOK_API_KEY;
    } else {
      process.env.CRASHLAB_WEBHOOK_API_KEY = originalKey;
    }
  });

  describe('when no API key is configured', () => {
    beforeEach(() => {
      delete process.env.CRASHLAB_WEBHOOK_API_KEY;
    });

    it('allows requests without an Authorization header', () => {
      const result = validateWebhookApiKey(makeRequest());
      expect(result).toBeUndefined();
    });

    it('allows requests with any Authorization header', () => {
      const result = validateWebhookApiKey(
        makeRequest({ authorization: 'Bearer whatever' }),
      );
      expect(result).toBeUndefined();
    });
  });

  describe('when an API key is configured', () => {
    const VALID_KEY = 'test-api-key-secret';

    beforeEach(() => {
      process.env.CRASHLAB_WEBHOOK_API_KEY = VALID_KEY;
    });

    it('returns undefined when the correct Bearer token is provided', () => {
      const result = validateWebhookApiKey(
        makeRequest({ authorization: `Bearer ${VALID_KEY}` }),
      );
      expect(result).toBeUndefined();
    });

    it('returns a 401 response when no Authorization header is present', async () => {
      const result = validateWebhookApiKey(makeRequest());
      expect(result).not.toBeUndefined();
      expect(result!.status).toBe(401);
      const body = await result!.json();
      expect(body.error).toMatch(/Authentication required/i);
    });

    it('returns a 401 response when the token is wrong', async () => {
      const result = validateWebhookApiKey(
        makeRequest({ authorization: 'Bearer wrong-key' }),
      );
      expect(result).not.toBeUndefined();
      expect(result!.status).toBe(401);
      const body = await result!.json();
      expect(body.error).toMatch(/Invalid API key/i);
    });

    it('returns a 401 response for a non-Bearer scheme', async () => {
      const result = validateWebhookApiKey(
        makeRequest({ authorization: `Basic ${VALID_KEY}` }),
      );
      expect(result).not.toBeUndefined();
      expect(result!.status).toBe(401);
    });

    it('returns a 401 response when the Authorization header is malformed', async () => {
      const result = validateWebhookApiKey(
        makeRequest({ authorization: 'Bearer token extra-part' }),
      );
      expect(result).not.toBeUndefined();
      expect(result!.status).toBe(401);
    });

    it('returns a 401 for an almost-correct key (off by one character)', async () => {
      const almostRight = VALID_KEY.slice(0, -1) + 'X';
      const result = validateWebhookApiKey(
        makeRequest({ authorization: `Bearer ${almostRight}` }),
      );
      expect(result).not.toBeUndefined();
      expect(result!.status).toBe(401);
    });

    it('is case-sensitive for the token value', async () => {
      const result = validateWebhookApiKey(
        makeRequest({ authorization: `Bearer ${VALID_KEY.toUpperCase()}` }),
      );
      expect(result).not.toBeUndefined();
      expect(result!.status).toBe(401);
    });
  });
});
