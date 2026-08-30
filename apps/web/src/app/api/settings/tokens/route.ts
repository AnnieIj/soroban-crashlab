import { NextRequest, NextResponse } from 'next/server';
import {
  createApiToken,
  listApiTokens,
  ApiTokenScope,
} from '../../../../lib/storage/api-token-store';

export async function GET() {
  const tokens = listApiTokens();
  return NextResponse.json({ tokens });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, scope, expiresAt } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Token name is required.' },
        { status: 400 },
      );
    }

    const validScopes: ApiTokenScope[] = ['read', 'write'];
    const tokenScope: ApiTokenScope = validScopes.includes(scope) ? scope : 'read';

    let validatedExpiry: string | null = null;
    if (expiresAt) {
      const parsed = new Date(expiresAt);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expiry date format.' },
          { status: 400 },
        );
      }
      validatedExpiry = parsed.toISOString();
    }

    const { secret, token } = createApiToken({
      name: name.trim(),
      scope: tokenScope,
      expiresAt: validatedExpiry,
    });

    return NextResponse.json(
      {
        message: 'Token created successfully. Store this secret safely as it will not be shown again.',
        secret,
        token,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to process token creation request.' },
      { status: 400 },
    );
  }
}
