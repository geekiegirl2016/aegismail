import type { Account, Mailbox, Message } from '@aegismail/core';

export interface ClientOptions {
  baseUrl: string;
  token: string;
  fetch?: typeof globalThis.fetch;
}

export class AegisApiClient {
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(private readonly options: ClientOptions) {
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  async listAccounts(): Promise<Account[]> {
    return (await this.req<{ accounts: Account[] }>('/v1/accounts')).accounts;
  }

  async listMailboxes(accountId: string): Promise<Mailbox[]> {
    return (
      await this.req<{ mailboxes: Mailbox[] }>(
        `/v1/accounts/${encodeURIComponent(accountId)}/mailboxes`,
      )
    ).mailboxes;
  }

  async listMessages(
    accountId: string,
    mailboxId: string,
    options: { limit?: number; pageToken?: string } = {},
  ): Promise<{ messages: Message[]; nextPageToken?: string | undefined }> {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    if (options.pageToken !== undefined) params.set('pageToken', options.pageToken);
    const qs = params.toString();
    const path = `/v1/accounts/${encodeURIComponent(accountId)}/mailboxes/${encodeURIComponent(
      mailboxId,
    )}/messages${qs ? `?${qs}` : ''}`;
    return this.req(path);
  }

  async getMessage(accountId: string, messageId: string): Promise<Message> {
    return (
      await this.req<{ message: Message }>(
        `/v1/accounts/${encodeURIComponent(accountId)}/messages/${encodeURIComponent(messageId)}`,
      )
    ).message;
  }

  private async req<T>(path: string): Promise<T> {
    const res = await this.fetchImpl(new URL(path, this.options.baseUrl).toString(), {
      headers: { authorization: `Bearer ${this.options.token}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AegisMail HTTP ${res.status}: ${text || res.statusText}`);
    }
    return (await res.json()) as T;
  }
}
