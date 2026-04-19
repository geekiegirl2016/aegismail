import { describe, it, expect } from 'vitest';
import { createLoopbackServer } from './loopback.ts';

describe('createLoopbackServer', () => {
  it('resolves with the code when state matches', async () => {
    const handle = await createLoopbackServer({
      expectedState: 'state-123',
      timeoutMs: 5_000,
    });

    expect(handle.redirectUri).toMatch(
      /^http:\/\/127\.0\.0\.1:\d+\/callback$/,
    );

    const url = new URL(handle.redirectUri);
    url.searchParams.set('code', 'auth-code-xyz');
    url.searchParams.set('state', 'state-123');
    const res = await fetch(url.toString());
    expect(res.status).toBe(200);

    const result = await handle.result;
    expect(result.code).toBe('auth-code-xyz');
    expect(result.state).toBe('state-123');
  });

  it('rejects when state does not match', async () => {
    const handle = await createLoopbackServer({
      expectedState: 'expected',
      timeoutMs: 5_000,
    });
    // Attach the assertion synchronously so the rejection isn't flagged
    // as unhandled by vitest's async rejection detector.
    const assertion = expect(handle.result).rejects.toThrow(/state mismatch/i);

    const url = new URL(handle.redirectUri);
    url.searchParams.set('code', 'auth-code');
    url.searchParams.set('state', 'forged');
    await fetch(url.toString());

    await assertion;
  });

  it('rejects when the provider returns an error', async () => {
    const handle = await createLoopbackServer({
      expectedState: 'state',
      timeoutMs: 5_000,
    });
    const assertion = expect(handle.result).rejects.toThrow(/User cancelled/);

    const url = new URL(handle.redirectUri);
    url.searchParams.set('error', 'access_denied');
    url.searchParams.set('error_description', 'User cancelled');
    await fetch(url.toString());

    await assertion;
  });

  it('rejects on explicit close()', async () => {
    const handle = await createLoopbackServer({
      expectedState: 'state',
      timeoutMs: 5_000,
    });
    const assertion = expect(handle.result).rejects.toThrow(/cancelled/);
    handle.close();
    await assertion;
  });

  it('binds only to 127.0.0.1, never to 0.0.0.0', async () => {
    const handle = await createLoopbackServer({
      expectedState: 'state',
      timeoutMs: 5_000,
    });
    expect(handle.redirectUri.startsWith('http://127.0.0.1:')).toBe(true);
    const assertion = expect(handle.result).rejects.toThrow();
    handle.close();
    await assertion;
  });
});
