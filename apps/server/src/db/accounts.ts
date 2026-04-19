import { randomUUID } from 'node:crypto';
import { Account, type AccountProvider } from '@aegismail/core';
import type { Db } from './index.ts';

export interface AccountRow {
  id: string;
  provider: string;
  display_name: string;
  email_address: string;
  config_json: string;
  created_at: string;
  updated_at: string;
}

function rowToAccount(row: AccountRow): Account {
  return Account.parse({
    id: row.id,
    provider: row.provider as AccountProvider,
    displayName: row.display_name,
    emailAddress: row.email_address,
    createdAt: row.created_at,
  });
}

export interface CreateAccountInput {
  provider: AccountProvider;
  displayName: string;
  emailAddress: string;
  config?: Record<string, unknown>;
}

export class AccountsRepo {
  constructor(private readonly db: Db) {}

  create(input: CreateAccountInput): Account {
    const id = randomUUID();
    const now = new Date().toISOString();
    const configJson = JSON.stringify(input.config ?? {});

    this.db
      .prepare(
        `INSERT INTO accounts (id, provider, display_name, email_address, config_json, created_at, updated_at)
         VALUES (@id, @provider, @displayName, @emailAddress, @configJson, @createdAt, @updatedAt)`,
      )
      .run({
        id,
        provider: input.provider,
        displayName: input.displayName,
        emailAddress: input.emailAddress,
        configJson,
        createdAt: now,
        updatedAt: now,
      });

    return Account.parse({
      id,
      provider: input.provider,
      displayName: input.displayName,
      emailAddress: input.emailAddress,
      createdAt: now,
    });
  }

  list(): Account[] {
    const rows = this.db
      .prepare<[], AccountRow>('SELECT * FROM accounts ORDER BY created_at ASC')
      .all();
    return rows.map(rowToAccount);
  }

  get(id: string): Account | null {
    const row = this.db
      .prepare<[string], AccountRow>('SELECT * FROM accounts WHERE id = ?')
      .get(id);
    return row ? rowToAccount(row) : null;
  }

  getConfig(id: string): Record<string, unknown> | null {
    const row = this.db
      .prepare<[string], { config_json: string }>(
        'SELECT config_json FROM accounts WHERE id = ?',
      )
      .get(id);
    if (!row) return null;
    return JSON.parse(row.config_json) as Record<string, unknown>;
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
