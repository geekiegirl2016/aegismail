import { AegisError } from '@aegismail/core';
import type { DraftMessage, Mailbox, Message } from '@aegismail/core';
import type { ListMessagesOptions, ListMessagesResult, MailProvider } from '../provider.ts';
import type { ImapAccountConfig, ImapCredentials } from './types.ts';

/**
 * Full implementation lands in Phase 2. This skeleton is here so the
 * server can type-check against the interface while foundations land.
 */
export class ImapProvider implements MailProvider {
  readonly id = 'icloud' as const;

  constructor(
    private readonly config: ImapAccountConfig,
    private readonly credentials: ImapCredentials,
  ) {}

  get host(): string {
    return this.config.host;
  }

  get username(): string {
    return this.credentials.username;
  }

  async listMailboxes(_accountId: string): Promise<Mailbox[]> {
    throw new AegisError('provider_error', 'ImapProvider.listMailboxes: pending Phase 2');
  }

  async listMessages(
    _accountId: string,
    _options: ListMessagesOptions,
  ): Promise<ListMessagesResult> {
    throw new AegisError('provider_error', 'ImapProvider.listMessages: pending Phase 2');
  }

  async getMessage(_accountId: string, _messageId: string): Promise<Message> {
    throw new AegisError('provider_error', 'ImapProvider.getMessage: pending Phase 2');
  }

  async sendMessage(_draft: DraftMessage): Promise<Message> {
    throw new AegisError('provider_error', 'ImapProvider.sendMessage: pending Phase 2');
  }

  async markRead(_accountId: string, _messageId: string, _isRead: boolean): Promise<void> {
    throw new AegisError('provider_error', 'ImapProvider.markRead: pending Phase 2');
  }
}
