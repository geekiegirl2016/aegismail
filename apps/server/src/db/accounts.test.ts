import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDb, type Db } from './index.ts';
import { AccountsRepo } from './accounts.ts';

describe('AccountsRepo', () => {
  let db: Db;
  let repo: AccountsRepo;

  beforeEach(() => {
    db = openDb({ path: ':memory:' });
    repo = new AccountsRepo(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates and retrieves an account', () => {
    const created = repo.create({
      provider: 'icloud',
      displayName: 'Test User',
      emailAddress: 'test@icloud.com',
    });

    expect(created.id).toBeTruthy();
    expect(created.provider).toBe('icloud');
    expect(created.emailAddress).toBe('test@icloud.com');

    const fetched = repo.get(created.id);
    expect(fetched).toEqual(created);
  });

  it('lists accounts in creation order', () => {
    const a = repo.create({
      provider: 'icloud',
      displayName: 'A',
      emailAddress: 'a@icloud.com',
    });
    const b = repo.create({
      provider: 'gmail',
      displayName: 'B',
      emailAddress: 'b@gmail.com',
    });

    const all = repo.list();
    expect(all.map((x) => x.id)).toEqual([a.id, b.id]);
  });

  it('rejects duplicate (provider, email) pairs', () => {
    repo.create({
      provider: 'icloud',
      displayName: 'First',
      emailAddress: 'dup@icloud.com',
    });

    expect(() =>
      repo.create({
        provider: 'icloud',
        displayName: 'Second',
        emailAddress: 'dup@icloud.com',
      }),
    ).toThrow(/UNIQUE/i);
  });

  it('stores and retrieves per-account config JSON', () => {
    const created = repo.create({
      provider: 'icloud',
      displayName: 'Test',
      emailAddress: 'cfg@icloud.com',
      config: { host: 'imap.mail.me.com', port: 993 },
    });

    const cfg = repo.getConfig(created.id);
    expect(cfg).toEqual({ host: 'imap.mail.me.com', port: 993 });
  });

  it('deletes an account and returns whether it existed', () => {
    const created = repo.create({
      provider: 'icloud',
      displayName: 'Bye',
      emailAddress: 'bye@icloud.com',
    });

    expect(repo.delete(created.id)).toBe(true);
    expect(repo.get(created.id)).toBeNull();
    expect(repo.delete(created.id)).toBe(false);
  });
});
