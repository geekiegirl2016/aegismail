import { AegisError } from '@aegismail/core';
import type { MailProvider } from '../provider.ts';

export class GmailProvider implements MailProvider {
  readonly id = 'gmail' as const;

  async listMailboxes(): Promise<never> {
    throw new AegisError('provider_error', 'GmailProvider.listMailboxes not yet implemented');
  }
  async listMessages(): Promise<never> {
    throw new AegisError('provider_error', 'GmailProvider.listMessages not yet implemented');
  }
  async getMessage(): Promise<never> {
    throw new AegisError('provider_error', 'GmailProvider.getMessage not yet implemented');
  }
  async sendMessage(): Promise<never> {
    throw new AegisError('provider_error', 'GmailProvider.sendMessage not yet implemented');
  }
  async markRead(): Promise<never> {
    throw new AegisError('provider_error', 'GmailProvider.markRead not yet implemented');
  }
  async markFlagged(): Promise<never> {
    throw new AegisError('provider_error', 'GmailProvider.markFlagged not yet implemented');
  }
  async moveMessage(): Promise<never> {
    throw new AegisError('provider_error', 'GmailProvider.moveMessage not yet implemented');
  }
}
