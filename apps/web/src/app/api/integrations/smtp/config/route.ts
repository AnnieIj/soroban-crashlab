import { NextRequest, NextResponse } from 'next/server';
import { validateSmtpConfig, type SmtpConfig } from '@/lib/integrations/smtp-email';
import { getStoredSmtpConfig, setStoredSmtpConfig } from '@/lib/integrations/smtp-store';

/**
 * GET /api/integrations/smtp/config
 * Returns the saved SMTP configuration, or 404 if none has been saved yet.
 */
export async function GET() {
  const config = getStoredSmtpConfig();
  if (!config) {
    return NextResponse.json({ error: 'No SMTP configuration saved yet.' }, { status: 404 });
  }
  return NextResponse.json(config);
}

/**
 * POST /api/integrations/smtp/config
 * Validates and persists an SMTP configuration. Body: SmtpConfig JSON.
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

  const candidate = body as SmtpConfig;
  const validationError = validateSmtpConfig(candidate);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 422 });
  }

  setStoredSmtpConfig(candidate);
  return NextResponse.json(candidate, { status: 200 });
}
