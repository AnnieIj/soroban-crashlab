// apps/web/src/lib/shareable-report-utils.ts

import crypto from "crypto";

/**
 * Generate a signed token containing the run ID and expiration timestamp.
 * Token format (base64url encoded JSON): { runId, expires, sig }
 */
export function generateShareableToken(runId: string, ttlMs: number = 24 * 60 * 60 * 1000): string {
  const expires = Date.now() + ttlMs;
  const payload = `${runId}:${expires}`;
  const secret = process.env.NAVY_SHAREABLE_SECRET ?? "default_secret";
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const tokenObj = { runId, expires, sig };
  const json = JSON.stringify(tokenObj);
  return Buffer.from(json).toString("base64url");
}

/** Verify the token and return the runId if valid, otherwise null */
export function verifyShareableToken(token: string): string | null {
  try {
    const json = Buffer.from(token, "base64url").toString();
    const { runId, expires, sig } = JSON.parse(json) as { runId: string; expires: number; sig: string };
    if (Date.now() > expires) return null;
    const payload = `${runId}:${expires}`;
    const secret = process.env.NAVY_SHAREABLE_SECRET ?? "default_secret";
    const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return expectedSig === sig ? runId : null;
  } catch {
    return null;
  }
}
