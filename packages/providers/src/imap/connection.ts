import { ImapFlow } from 'imapflow';
import { AegisError } from '@aegismail/core';

export interface ImapConnectionOptions {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

/**
 * Wraps a single ImapFlow client and keeps it alive across calls.
 * Auto-reconnects on next `acquire()` if the underlying socket dropped.
 */
export class ImapConnection {
  private cached: ImapFlow | null = null;
  private inflight: Promise<ImapFlow> | null = null;

  constructor(private readonly options: ImapConnectionOptions) {}

  async acquire(): Promise<ImapFlow> {
    if (this.cached && this.cached.usable) return this.cached;
    if (this.inflight) return this.inflight;

    this.inflight = this.connect();
    try {
      this.cached = await this.inflight;
      return this.cached;
    } finally {
      this.inflight = null;
    }
  }

  private async connect(): Promise<ImapFlow> {
    const client = new ImapFlow({
      host: this.options.host,
      port: this.options.port,
      secure: this.options.secure,
      auth: {
        user: this.options.username,
        pass: this.options.password,
      },
      logger: false,
      tls: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      },
    });

    try {
      await client.connect();
    } catch (err) {
      throw mapImapError(err, 'IMAP connect/auth failed');
    }
    return client;
  }

  async close(): Promise<void> {
    const client = this.cached;
    this.cached = null;
    if (client && client.usable) {
      try {
        await client.logout();
      } catch {
        // best-effort
      }
    }
  }
}

/**
 * Translate IMAP/network errors into AegisError with a code the rest of
 * the stack can switch on without sniffing messages.
 */
export function mapImapError(err: unknown, fallbackMessage: string): AegisError {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('invalid credentials') || lower.includes('authenticationfailed')) {
    return new AegisError('unauthorized', 'IMAP authentication failed', { cause: err });
  }
  if (lower.includes('rate') || lower.includes('too many')) {
    return new AegisError('rate_limited', 'IMAP rate limited', { cause: err });
  }
  if (lower.includes('no such mailbox') || lower.includes('nonexistent')) {
    return new AegisError('not_found', 'Mailbox not found', { cause: err });
  }
  return new AegisError('provider_error', `${fallbackMessage}: ${msg}`, { cause: err });
}
