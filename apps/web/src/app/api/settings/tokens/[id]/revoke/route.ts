import { NextRequest, NextResponse } from 'next/server';
import { revokeApiToken } from '../../../../../../lib/storage/api-token-store';

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Token ID required.' }, { status: 400 });
  }

  const success = revokeApiToken(id);
  if (!success) {
    return NextResponse.json({ error: 'Token not found.' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Token revoked successfully.' });
}
