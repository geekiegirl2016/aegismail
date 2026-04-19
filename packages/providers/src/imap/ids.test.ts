import { describe, it, expect } from 'vitest';
import { makeMailboxId, makeMessageId, parseMailboxId, parseMessageId } from './ids.ts';

describe('mailbox ids', () => {
  it('round-trips a simple path', () => {
    const id = makeMailboxId('acct-1', 'INBOX');
    expect(parseMailboxId(id)).toEqual({ accountId: 'acct-1', path: 'INBOX' });
  });

  it('round-trips a path with slashes, dots, and colons', () => {
    const id = makeMailboxId('acct-1', 'INBOX.Sub/folder:weird');
    expect(parseMailboxId(id)).toEqual({
      accountId: 'acct-1',
      path: 'INBOX.Sub/folder:weird',
    });
  });

  it('returns null on malformed mailbox id', () => {
    expect(parseMailboxId('no-separator')).toBeNull();
  });
});

describe('message ids', () => {
  it('round-trips a simple message id', () => {
    const id = makeMessageId('acct-1', 'INBOX', 12345);
    expect(parseMessageId(id)).toEqual({ accountId: 'acct-1', path: 'INBOX', uid: 12345 });
  });

  it('round-trips when the path has separators', () => {
    const id = makeMessageId('acct-1', 'Sub/folder:weird', 42);
    expect(parseMessageId(id)).toEqual({
      accountId: 'acct-1',
      path: 'Sub/folder:weird',
      uid: 42,
    });
  });

  it('rejects non-numeric uid', () => {
    expect(parseMessageId('acct::INBOX::abc')).toBeNull();
  });

  it('rejects zero and negative uids', () => {
    expect(parseMessageId('acct::INBOX::0')).toBeNull();
    expect(parseMessageId('acct::INBOX::-5')).toBeNull();
  });

  it('rejects malformed ids with too few separators', () => {
    expect(parseMessageId('acct-INBOX-42')).toBeNull();
    expect(parseMessageId('acct::INBOX')).toBeNull();
  });
});
