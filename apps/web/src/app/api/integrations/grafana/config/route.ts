/**
 * GET  /api/integrations/grafana/config  – load saved Grafana configuration
 * POST /api/integrations/grafana/config  – persist Grafana configuration
 *
 * In the absence of a persistent store this implementation uses a module-level
 * in-memory cache, matching the lightweight pattern used throughout this codebase.
 */

import { NextResponse } from 'next/server';
import type { GrafanaConfig } from '../../../../integrate-grafana-dashboard-annotation-api-utils';

// Module-level in-memory store (same pattern as other lightweight integrations).
let storedConfig: GrafanaConfig | null = null;

export async function GET() {
  if (!storedConfig) {
    return NextResponse.json({ error: 'No configuration saved yet' }, { status: 404 });
  }
  return NextResponse.json(storedConfig);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GrafanaConfig;

    if (!body || typeof body.baseUrl !== 'string') {
      return NextResponse.json({ error: 'Invalid configuration payload' }, { status: 400 });
    }

    storedConfig = body;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to parse request body' }, { status: 400 });
  }
}
