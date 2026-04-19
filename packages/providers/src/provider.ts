import type { Account, DraftMessage, Mailbox, Message } from '@aegismail/core';

export interface ListMessagesOptions {
  mailboxId: string;
  limit?: number;
  pageToken?: string | undefined;
}

export interface ListMessagesResult {
  messages: Message[];
  nextPageToken?: string | undefined;
}

export interface MailProvider {
  readonly id: Account['provider'];
  listMailboxes(accountId: string): Promise<Mailbox[]>;
  listMessages(accountId: string, options: ListMessagesOptions): Promise<ListMessagesResult>;
  getMessage(accountId: string, messageId: string): Promise<Message>;
  sendMessage(draft: DraftMessage): Promise<Message>;
  markRead(accountId: string, messageId: string, isRead: boolean): Promise<void>;
}
