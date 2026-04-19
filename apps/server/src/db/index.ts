import BetterSqlite3 from 'better-sqlite3';
import type Database from 'better-sqlite3';
import { runMigrations } from './migrations.ts';
import { defaultDbPath } from './paths.ts';

export type Db = Database.Database;

export interface OpenDbOptions {
  path?: string;
  readonly?: boolean;
}

/**
 * Open the AegisMail SQLite database, applying pragmas suitable for a
 * local-first desktop app and running any pending migrations.
 *
 * - `journal_mode = WAL` — concurrent readers + a writer, survives crashes.
 * - `synchronous = NORMAL` — fsync at checkpoints, not every commit (safe in WAL).
 * - `foreign_keys = ON` — enforce the ON DELETE CASCADE on accounts.
 */
export function openDb(options: OpenDbOptions = {}): Db {
  const dbPath = options.path ?? defaultDbPath();
  const db = new BetterSqlite3(dbPath, options.readonly ? { readonly: true } : {});

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  if (!options.readonly) runMigrations(db);
  return db;
}
