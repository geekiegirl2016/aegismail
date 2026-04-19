import { simpleParser, type AddressObject, type ParsedMail } from 'mailparser';
import type { FetchMessageObject, ImapFlow, ListResponse, MailboxObject } from 'imapflow';
import { AegisError } from '@aegismail/core';
import type {
  DraftMessage,
  EmailAddress,
  Mailbox,
  Message,
} from '@aegismail/core';
import type { ListMessagesOptions, ListMessagesResult, MailProvider } from '../provider.ts';
import { ImapConnection, type ImapConnectionAuth, mapImapError } from './connection.ts';
import {
  makeMailboxId,
  makeMessageId,
  parseMailboxId,
  parseMessageId,
} from './ids.ts';
import { inferRole } from './mailbox-role.ts';
import type { ImapAccountConfig, ImapCredentials } from './types.ts';

export interface ImapOAuthCredentials {
  username: string;
  getAccessToken: () => Promise<string>;
}

export interface ImapProviderOptions {
  accountId: string;
  /** Which AccountProvider label this instance reports as. Defaults to 'icloud'. */
  providerId?: 'icloud' | 'gmail';
  config: ImapAccountConfig;
  /** Static password or an OAuth2 access-token supplier. */
  credentials: ImapCredentials | ImapOAuthCredentials;
}

export class ImapProvider implements MailProvider {
  readonly id: 'icloud' | 'gmail';
  readonly accountId: string;
  private readonly connection: ImapConnection;

  constructor(options: ImapProviderOptions) {
    this.accountId = options.accountId;
    this.id = options.providerId ?? 'icloud';

    const auth: ImapConnectionAuth =
      'password' in options.credentials
        ? { kind: 'password', password: options.credentials.password }
        : { kind: 'oauth2', getAccessToken: options.credentials.getAccessToken };

    this.connection = new ImapConnection({
      host: options.config.host,
      port: options.config.port,
      secure: options.config.secure,
      username: options.credentials.username,
      auth,
    });
  }

  async close(): Promise<void> {
    await this.connection.close();
  }

  async listMailboxes(accountId: string): Promise<Mailbox[]> {
    this.assertOwns(accountId);
    const client = await this.connection.acquire();

    let rows: ListResponse[];
    try {
      rows = await client.list({ statusQuery: { messages: true, unseen: true } });
    } catch (err) {
      throw mapImapError(err, 'list mailboxes failed');
    }

    return rows
      .filter((row) => !row.flags?.has('\\Noselect'))
      .map((row) => {
        const role = inferRole(row.path, row.specialUse);
        return {
          id: makeMailboxId(accountId, row.path),
          accountId,
          name: row.name || row.path,
          role,
          unreadCount: row.status?.unseen ?? 0,
          totalCount: row.status?.messages ?? 0,
        } satisfies Mailbox;
      });
  }

  async listMessages(
    accountId: string,
    options: ListMessagesOptions,
  ): Promise<ListMessagesResult> {
    this.assertOwns(accountId);
    const parsed = parseMailboxId(options.mailboxId);
    if (!parsed || parsed.accountId !== accountId) {
      throw new AegisError('invalid_input', `Mailbox not on this account: ${options.mailboxId}`);
    }

    const limit = Math.max(1, Math.min(options.limit ?? 25, 100));
    const client = await this.connection.acquire();

    const lock = await client.getMailboxLock(parsed.path, { readOnly: true });
    try {
      const status = client.mailbox as MailboxObject;
      const total = status.exists;
      if (total === 0) return { messages: [] };

      const pageToken = options.pageToken ? Number.parseInt(options.pageToken, 10) : null;
      const upperUid =
        pageToken && Number.isFinite(pageToken) && pageToken > 1 ? pageToken - 1 : null;

      const range = upperUid ? `1:${upperUid}` : '1:*';
      const fetched: FetchMessageObject[] = [];
      for await (const msg of client.fetch(range, {
        uid: true,
        envelope: true,
        flags: true,
        size: true,
        bodyStructure: false,
      }, { uid: true })) {
        fetched.push(msg);
      }

      fetched.sort((a, b) => b.uid - a.uid);
      const windowed = fetched.slice(0, limit);

      const messages = windowed.map((m) =>
        envelopeToMessage(accountId, parsed.path, m),
      );

      const nextPageToken =
        fetched.length > limit ? String(windowed[windowed.length - 1]?.uid ?? '') : undefined;

      return nextPageToken ? { messages, nextPageToken } : { messages };
    } catch (err) {
      throw mapImapError(err, 'list messages failed');
    } finally {
      lock.release();
    }
  }

  async getMessage(accountId: string, messageId: string): Promise<Message> {
    this.assertOwns(accountId);
    const parsed = parseMessageId(messageId);
    if (!parsed || parsed.accountId !== accountId) {
      throw new AegisError('invalid_input', `Message not on this account: ${messageId}`);
    }

    const client = await this.connection.acquire();
    const lock = await client.getMailboxLock(parsed.path, { readOnly: true });
    try {
      const result = await client.fetchOne(
        String(parsed.uid),
        { uid: true, envelope: true, flags: true, source: true, size: true },
        { uid: true },
      );
      if (!result || !result.source) {
        throw new AegisError('not_found', `Message ${messageId} not found`);
      }
      const parsedMail = await simpleParser(result.source);
      return fullMessage(accountId, parsed.path, result, parsedMail);
    } catch (err) {
      if (err instanceof AegisError) throw err;
      throw mapImapError(err, 'get message failed');
    } finally {
      lock.release();
    }
  }

  async sendMessage(_draft: DraftMessage): Promise<Message> {
    throw new AegisError(
      'provider_error',
      'ImapProvider.sendMessage requires SMTP; not yet implemented',
    );
  }

  async markRead(accountId: string, messageId: string, isRead: boolean): Promise<void> {
    this.assertOwns(accountId);
    const parsed = parseMessageId(messageId);
    if (!parsed || parsed.accountId !== accountId) {
      throw new AegisError('invalid_input', `Message not on this account: ${messageId}`);
    }
    const client = await this.connection.acquire();
    const lock = await client.getMailboxLock(parsed.path);
    try {
      const range = String(parsed.uid);
      if (isRead) {
        await client.messageFlagsAdd(range, ['\\Seen'], { uid: true });
      } else {
        await client.messageFlagsRemove(range, ['\\Seen'], { uid: true });
      }
    } catch (err) {
      throw mapImapError(err, 'mark read failed');
    } finally {
      lock.release();
    }
  }

  async markFlagged(accountId: string, messageId: string, isFlagged: boolean): Promise<void> {
    this.assertOwns(accountId);
    const parsed = parseMessageId(messageId);
    if (!parsed || parsed.accountId !== accountId) {
      throw new AegisError('invalid_input', `Message not on this account: ${messageId}`);
    }
    const client = await this.connection.acquire();
    const lock = await client.getMailboxLock(parsed.path);
    try {
      const range = String(parsed.uid);
      if (isFlagged) {
        await client.messageFlagsAdd(range, ['\\Flagged'], { uid: true });
      } else {
        await client.messageFlagsRemove(range, ['\\Flagged'], { uid: true });
      }
    } catch (err) {
      throw mapImapError(err, 'mark flagged failed');
    } finally {
      lock.release();
    }
  }

  async moveMessage(
    accountId: string,
    messageId: string,
    targetMailboxId: string,
  ): Promise<string> {
    this.assertOwns(accountId);
    const srcParsed = parseMessageId(messageId);
    if (!srcParsed || srcParsed.accountId !== accountId) {
      throw new AegisError('invalid_input', `Message not on this account: ${messageId}`);
    }
    const dstParsed = parseMailboxId(targetMailboxId);
    if (!dstParsed || dstParsed.accountId !== accountId) {
      throw new AegisError(
        'invalid_input',
        `Target mailbox not on this account: ${targetMailboxId}`,
      );
    }
    if (srcParsed.path === dstParsed.path) {
      return messageId;
    }

    const client = await this.connection.acquire();
    const lock = await client.getMailboxLock(srcParsed.path);
    try {
      const result = await client.messageMove(String(srcParsed.uid), dstParsed.path, {
        uid: true,
      });
      if (!result) {
        throw new AegisError('provider_error', 'IMAP MOVE returned no response');
      }
      // imapflow returns { path, destination, uidMap } on success, where
      // uidMap is a Map<srcUid, dstUid>. Pick our dest UID from it.
      const newUid = result.uidMap?.get(srcParsed.uid);
      if (typeof newUid !== 'number') {
        // Fallback: can't know new UID; return a best-effort ID pointing
        // at the destination mailbox without a uid. Callers should
        // refresh the destination list.
        return makeMessageId(accountId, dstParsed.path, srcParsed.uid);
      }
      return makeMessageId(accountId, dstParsed.path, newUid);
    } catch (err) {
      throw mapImapError(err, 'move message failed');
    } finally {
      lock.release();
    }
  }

  private assertOwns(accountId: string): void {
    if (accountId !== this.accountId) {
      throw new AegisError(
        'invalid_input',
        `ImapProvider bound to ${this.accountId}, called with ${accountId}`,
      );
    }
  }
}

function addrListFromEnvelope(
  list: ReadonlyArray<{ name?: string; address?: string }> | undefined,
): EmailAddress[] {
  if (!list) return [];
  const out: EmailAddress[] = [];
  for (const a of list) {
    if (!a.address) continue;
    out.push(a.name ? { name: a.name, address: a.address } : { address: a.address });
  }
  return out;
}

function envelopeToMessage(
  accountId: string,
  path: string,
  m: FetchMessageObject,
): Message {
  const env = m.envelope ?? {};
  const fromList = addrListFromEnvelope(env.from);
  const flags = m.flags ?? new Set<string>();
  const received = env.date instanceof Date ? env.date.toISOString() : new Date().toISOString();

  return {
    id: makeMessageId(accountId, path, m.uid),
    accountId,
    mailboxId: makeMailboxId(accountId, path),
    ...(env.inReplyTo ? { threadId: env.inReplyTo } : {}),
    from: fromList[0] ?? { address: 'unknown@unknown' },
    to: addrListFromEnvelope(env.to),
    cc: addrListFromEnvelope(env.cc),
    bcc: addrListFromEnvelope(env.bcc),
    subject: env.subject ?? '',
    snippet: '',
    receivedAt: received,
    isRead: flags.has('\\Seen'),
    isFlagged: flags.has('\\Flagged'),
    hasAttachments: false,
  };
}

function addressObjectToList(a: AddressObject | AddressObject[] | undefined): EmailAddress[] {
  if (!a) return [];
  const arr = Array.isArray(a) ? a : [a];
  const out: EmailAddress[] = [];
  for (const obj of arr) {
    for (const v of obj.value) {
      if (!v.address) continue;
      out.push(v.name ? { name: v.name, address: v.address } : { address: v.address });
    }
  }
  return out;
}

function fullMessage(
  accountId: string,
  path: string,
  m: FetchMessageObject,
  parsed: ParsedMail,
): Message {
  const envelope = envelopeToMessage(accountId, path, m);

  const text = parsed.text ?? undefined;
  const html = typeof parsed.html === 'string' ? parsed.html : undefined;
  const snippet = (text ?? '').replace(/\s+/g, ' ').slice(0, 240).trim();

  return {
    ...envelope,
    from: addressObjectToList(parsed.from)[0] ?? envelope.from,
    to: addressObjectToList(parsed.to),
    cc: addressObjectToList(parsed.cc),
    bcc: addressObjectToList(parsed.bcc),
    subject: parsed.subject ?? envelope.subject,
    snippet,
    ...(text !== undefined ? { bodyText: text } : {}),
    ...(html !== undefined ? { bodyHtml: html } : {}),
    hasAttachments: (parsed.attachments?.length ?? 0) > 0,
  };
}
