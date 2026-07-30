import { NextResponse } from 'next/server';
import { getEmailLog } from '@/lib/integrations/smtp-store';

/**
 * GET /api/integrations/smtp/history
 * Returns the recent SMTP send history for this server process.
 */
export async function GET() {
  return NextResponse.json({ history: getEmailLog() });
}
