import { NextResponse } from 'next/server';
import { buildMockCrashReports } from '@/lib/integrations/sentry-store';

/**
 * GET /api/sentry/reports
 * Returns recent crash reports that have been (or are pending being) sent to Sentry.
 */
export async function GET() {
  return NextResponse.json({ reports: buildMockCrashReports() });
}
