import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { generatePkce, generateState } from './pkce.ts';

describe('generatePkce', () => {
  it('produces a verifier within the RFC 7636 length window (43-128 chars)', () => {
    const { verifier } = generatePkce();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
  });

  it('uses base64url characters only (no +, /, =, or padding)', () => {
    const { verifier, challenge } = generatePkce();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('challenge is SHA-256(verifier) base64url-encoded', () => {
    const { verifier, challenge } = generatePkce();
    const expected = createHash('sha256').update(verifier).digest('base64url');
    expect(challenge).toBe(expected);
  });

  it('generates unique verifiers across calls', () => {
    const a = generatePkce();
    const b = generatePkce();
    expect(a.verifier).not.toBe(b.verifier);
    expect(a.challenge).not.toBe(b.challenge);
  });
});

describe('generateState', () => {
  it('returns a url-safe random string of at least 32 chars', () => {
    const state = generateState();
    expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(state.length).toBeGreaterThanOrEqual(32);
  });

  it('is unpredictable across calls', () => {
    const a = generateState();
    const b = generateState();
    expect(a).not.toBe(b);
  });
});
