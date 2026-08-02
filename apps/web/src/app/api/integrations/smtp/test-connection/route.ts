import { NextRequest, NextResponse } from 'next/server';
import {
  verifySmtpConnection,
  validateSmtpConfig,
  type SmtpConfig,
} from '@/lib/integrations/smtp-email';

/**
 * POST /api/integrations/smtp/test-connection
 * Verifies that the supplied SMTP configuration can authenticate with the
 * mail server, without sending an email. Body: SmtpConfig JSON.
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
    return NextResponse.json({ success: false, error: validationError }, { status: 422 });
  }

  const result = await verifySmtpConnection(candidate);
  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}
