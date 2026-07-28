import { NextRequest, NextResponse } from 'next/server';
import { testSentryConnection } from '@/lib/integrations/sentry-store';

/**
 * POST /api/sentry/test-connection
 * Checks whether a given DSN looks like a valid, reachable Sentry endpoint.
 * Body: { dsn: string }
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).dsn !== 'string'
  ) {
    return NextResponse.json({ error: 'Field "dsn" must be a string.' }, { status: 400 });
  }

  const result = testSentryConnection((body as { dsn: string }).dsn);
  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}
