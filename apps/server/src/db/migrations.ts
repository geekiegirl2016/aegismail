import type Database from 'better-sqlite3';

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly up: (db: Database.Database) => void;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up(db) {
      db.exec(`
        CREATE TABLE accounts (
          id             TEXT PRIMARY KEY,
          provider       TEXT NOT NULL CHECK (provider IN ('outlook','gmail','icloud')),
          display_name   TEXT NOT NULL,
          email_address  TEXT NOT NULL,
          config_json    TEXT NOT NULL DEFAULT '{}',
          created_at     TEXT NOT NULL,
          updated_at     TEXT NOT NULL,
          UNIQUE(provider, email_address)
        );

        CREATE TABLE mailboxes (
          id            TEXT PRIMARY KEY,
          account_id    TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          path          TEXT NOT NULL,
          name          TEXT NOT NULL,
          role          TEXT NOT NULL DEFAULT 'other',
          unread_count  INTEGER NOT NULL DEFAULT 0,
          total_count   INTEGER NOT NULL DEFAULT 0,
          uid_validity  INTEGER,
          uid_next      INTEGER,
          UNIQUE(account_id, path)
        );
        CREATE INDEX idx_mailboxes_account ON mailboxes(account_id);

        CREATE TABLE messages (
          id                 TEXT PRIMARY KEY,
          account_id         TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          mailbox_id         TEXT NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
          uid                INTEGER NOT NULL,
          thread_id          TEXT,
          message_id_header  TEXT,
          in_reply_to        TEXT,
          from_json          TEXT NOT NULL,
          to_json            TEXT NOT NULL DEFAULT '[]',
          cc_json            TEXT NOT NULL DEFAULT '[]',
          bcc_json           TEXT NOT NULL DEFAULT '[]',
          subject            TEXT NOT NULL DEFAULT '',
          snippet            TEXT NOT NULL DEFAULT '',
          body_text          TEXT,
          body_html          TEXT,
          received_at        TEXT NOT NULL,
          is_read            INTEGER NOT NULL DEFAULT 0,
          is_flagged         INTEGER NOT NULL DEFAULT 0,
          has_attachments    INTEGER NOT NULL DEFAULT 0,
          flags_json         TEXT NOT NULL DEFAULT '[]',
          size               INTEGER,
          UNIQUE(account_id, mailbox_id, uid)
        );
        CREATE INDEX idx_messages_mailbox_received
          ON messages(mailbox_id, received_at DESC);
        CREATE INDEX idx_messages_thread
          ON messages(thread_id)
          WHERE thread_id IS NOT NULL;
        CREATE INDEX idx_messages_message_id
          ON messages(message_id_header)
          WHERE message_id_header IS NOT NULL;
      `);
    },
  },
];

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name    TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = db
    .prepare<[], { version: number }>('SELECT version FROM schema_migrations ORDER BY version')
    .all()
    .map((r) => r.version);
  const appliedSet = new Set(applied);

  const insertVersion = db.prepare(
    'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
  );

  const apply = db.transaction((m: Migration) => {
    m.up(db);
    insertVersion.run(m.version, m.name, new Date().toISOString());
  });

  for (const migration of MIGRATIONS) {
    if (appliedSet.has(migration.version)) continue;
    apply(migration);
  }
}
