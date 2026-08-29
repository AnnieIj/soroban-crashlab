import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const CORRELATION_ID_HEADER = 'x-correlation-id';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add correlation ID for request tracking
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) || generateCorrelationId();
  response.headers.set(CORRELATION_ID_HEADER, correlationId);

  // Store correlation ID in response headers for client access
  response.headers.set('X-Correlation-ID', correlationId);

  return response;
}

export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${Math.random().toString(36).substring(2, 11)}`;
}

export const config = {
  matcher: ['/api/:path*'],
};
