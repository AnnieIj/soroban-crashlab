import { NextRequest, NextResponse } from 'next/server';
import {
  validateSentryConfig,
  type SentryConfig,
} from '@/app/integrate-sentry-integration-for-crash-reporting-utils';

// In-memory store (persists for the lifetime of the process)
let config: SentryConfig | null = null;

/**
 * GET /api/sentry/config
 * Returns the saved Sentry configuration, or 404 if none has been saved yet.
 */
export async function GET() {
  if (!config) {
    return NextResponse.json({ error: 'No Sentry configuration saved yet.' }, { status: 404 });
  }
  return NextResponse.json(config);
}

/**
 * POST /api/sentry/config
 * Validates and persists a Sentry configuration. Body: SentryConfig JSON.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
  }

  const candidate = body as SentryConfig;
  const validation = validateSentryConfig(candidate);
  if (!validation.isValid) {
    return NextResponse.json({ error: validation.errors.join('; ') }, { status: 422 });
  }

  config = candidate;
  return NextResponse.json(config, { status: 200 });
}
