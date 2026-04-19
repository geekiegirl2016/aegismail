import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCredentialStore } from './keychain.ts';

describe('InMemoryCredentialStore', () => {
  let store: InMemoryCredentialStore;

  beforeEach(() => {
    store = new InMemoryCredentialStore();
  });

  it('stores and retrieves account passwords', async () => {
    await store.setPassword('acct-1', 'hunter2');
    expect(await store.getPassword('acct-1')).toBe('hunter2');
  });

  it('returns null for unknown accounts', async () => {
    expect(await store.getPassword('missing')).toBeNull();
  });

  it('deletes stored passwords', async () => {
    await store.setPassword('acct-1', 'hunter2');
    expect(await store.deletePassword('acct-1')).toBe(true);
    expect(await store.getPassword('acct-1')).toBeNull();
    expect(await store.deletePassword('acct-1')).toBe(false);
  });

  it('mints and reuses a server token', async () => {
    const first = await store.getOrCreateServerToken();
    const second = await store.getOrCreateServerToken();
    expect(first).toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first.length).toBeGreaterThanOrEqual(32);
  });

  it('rotates the server token', async () => {
    const first = await store.getOrCreateServerToken();
    const rotated = await store.rotateServerToken();
    expect(rotated).not.toBe(first);
    expect(await store.getOrCreateServerToken()).toBe(rotated);
  });
});
