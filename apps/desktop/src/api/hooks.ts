import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { Account, Mailbox, Message } from '@aegismail/core';
import { api } from './client.ts';

export const qk = {
  accounts: ['accounts'] as const,
  mailboxes: (accountId: string) => ['mailboxes', accountId] as const,
  messages: (accountId: string, mailboxId: string) =>
    ['messages', accountId, mailboxId] as const,
  message: (accountId: string, messageId: string) =>
    ['message', accountId, messageId] as const,
};

export function useAccounts(): UseQueryResult<Account[]> {
  return useQuery({
    queryKey: qk.accounts,
    queryFn: async () => (await api.listAccounts()).accounts,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createAccount,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.accounts });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.accounts });
    },
  });
}

export function useMailboxes(accountId: string | null): UseQueryResult<Mailbox[]> {
  return useQuery({
    queryKey: accountId ? qk.mailboxes(accountId) : ['mailboxes', 'none'],
    queryFn: async () => {
      if (!accountId) return [];
      return (await api.listMailboxes(accountId)).mailboxes;
    },
    enabled: !!accountId,
  });
}

export function useMessages(
  accountId: string | null,
  mailboxId: string | null,
): UseQueryResult<Message[]> {
  return useQuery({
    queryKey:
      accountId && mailboxId
        ? qk.messages(accountId, mailboxId)
        : ['messages', 'none'],
    queryFn: async () => {
      if (!accountId || !mailboxId) return [];
      return (await api.listMessages(accountId, mailboxId, { limit: 50 })).messages;
    },
    enabled: !!accountId && !!mailboxId,
    staleTime: 30_000,
  });
}

export function useMessage(
  accountId: string | null,
  messageId: string | null,
): UseQueryResult<Message> {
  return useQuery({
    queryKey:
      accountId && messageId
        ? qk.message(accountId, messageId)
        : ['message', 'none'],
    queryFn: async () => {
      if (!accountId || !messageId) throw new Error('missing ids');
      return (await api.getMessage(accountId, messageId)).message;
    },
    enabled: !!accountId && !!messageId,
  });
}

export function useMarkRead(accountId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { messageId: string; isRead: boolean }) => {
      if (!accountId) throw new Error('no account');
      await api.markRead(accountId, input.messageId, input.isRead);
    },
    onSuccess: () => {
      if (!accountId) return;
      void qc.invalidateQueries({ queryKey: ['messages', accountId] });
      void qc.invalidateQueries({ queryKey: ['message', accountId] });
    },
  });
}
