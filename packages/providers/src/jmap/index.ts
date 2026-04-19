import { AegisError } from '@aegismail/core';
import type { MailProvider } from '../provider.ts';

export class JmapProvider implements MailProvider {
  readonly id = 'icloud' as const;

  async listMailboxes(): Promise<never> {
    throw new AegisError('provider_error', 'JmapProvider.listMailboxes not yet implemented');
  }
  async listMessages(): Promise<never> {
    throw new AegisError('provider_error', 'JmapProvider.listMessages not yet implemented');
  }
  async getMessage(): Promise<never> {
    throw new AegisError('provider_error', 'JmapProvider.getMessage not yet implemented');
  }
  async sendMessage(): Promise<never> {
    throw new AegisError('provider_error', 'JmapProvider.sendMessage not yet implemented');
  }
  async markRead(): Promise<never> {
    throw new AegisError('provider_error', 'JmapProvider.markRead not yet implemented');
  }
}
