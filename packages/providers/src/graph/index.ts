import { AegisError } from '@aegismail/core';
import type { MailProvider } from '../provider.ts';

export class GraphProvider implements MailProvider {
  readonly id = 'outlook' as const;

  async listMailboxes(): Promise<never> {
    throw new AegisError('provider_error', 'GraphProvider.listMailboxes not yet implemented');
  }
  async listMessages(): Promise<never> {
    throw new AegisError('provider_error', 'GraphProvider.listMessages not yet implemented');
  }
  async getMessage(): Promise<never> {
    throw new AegisError('provider_error', 'GraphProvider.getMessage not yet implemented');
  }
  async sendMessage(): Promise<never> {
    throw new AegisError('provider_error', 'GraphProvider.sendMessage not yet implemented');
  }
  async markRead(): Promise<never> {
    throw new AegisError('provider_error', 'GraphProvider.markRead not yet implemented');
  }
}
