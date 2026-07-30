import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, validateEmail } from '@/lib/integrations/smtp-email';
import { getStoredSmtpConfig, recordEmailLogEntry } from '@/lib/integrations/smtp-store';

const TEST_SUBJECT = '[Test] SorobanCrashLab SMTP Integration';

/**
 * POST /api/integrations/smtp/send
 * Sends a test email to the given recipient using the saved SMTP
 * configuration. Body: { to: string }
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const to =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>).to
      : undefined;

  if (typeof to !== 'string' || !validateEmail(to)) {
    return NextResponse.json(
      { error: 'Field "to" must be a valid email address.' },
      { status: 400 },
    );
  }

  const config = getStoredSmtpConfig();
  if (!config) {
    return NextResponse.json(
      { error: 'No SMTP configuration saved yet. Save your configuration before sending a test email.' },
      { status: 404 },
    );
  }

  const result = await sendEmail(config, {
    to,
    subject: TEST_SUBJECT,
    text: 'This is a test email confirming your SMTP integration is configured correctly.',
    html: '<p>This is a test email confirming your SMTP integration is configured correctly.</p>',
  });

  recordEmailLogEntry({
    id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    to,
    subject: TEST_SUBJECT,
    status: result.success ? 'sent' : 'failed',
    sentAt: new Date().toISOString(),
    messageId: result.messageId,
    error: result.error,
  });

  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}
