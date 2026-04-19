import { createHash, randomBytes } from 'node:crypto';

/**
 * Proof Key for Code Exchange (RFC 7636). Public OAuth clients like a
 * desktop app can't safely ship a client_secret, so PKCE binds the
 * authorization request to a specific runtime-generated secret that the
 * token endpoint later verifies.
 *
 * Flow:
 *   1. generatePkce() → { verifier, challenge }
 *   2. Send `code_challenge=<challenge>&code_challenge_method=S256` on
 *      the authorization request.
 *   3. Receive authorization code via loopback redirect.
 *   4. Send `code_verifier=<verifier>` on the token exchange request.
 */
export interface PkcePair {
  verifier: string;
  challenge: string;
}

export function generatePkce(): PkcePair {
  // 32 random bytes → 43 char base64url (RFC 7636 §4.1 requires 43-128 chars).
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

/** Cryptographically random opaque state param, 32 bytes base64url. */
export function generateState(): string {
  return randomBytes(32).toString('base64url');
}
