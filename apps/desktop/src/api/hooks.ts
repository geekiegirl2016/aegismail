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

export function usePrefetchMessage(accountId: string | null) {
  const qc = useQueryClient();
  return (messageId: string) => {
    if (!accountId) return;
    void qc.prefetchQuery({
      queryKey: qk.message(accountId, messageId),
      queryFn: async () => (await api.getMessage(accountId, messageId)).message,
      staleTime: 60_000,
    });
  };
}

/**
 * Apply a partial update to a message inside every cached `messages`
 * list and in its detail cache. Used by optimistic flag/read toggles.
 */
function patchMessageInCaches(
  qc: ReturnType<typeof useQueryClient>,
  accountId: string,
  messageId: string,
  patch: Partial<Message>,
): () => void {
  const snapshots: Array<[readonly unknown[], Message[] | undefined]> = [];

  const messageKeyPrefix = ['messages', accountId] as const;
  const listQueries = qc.getQueriesData<Message[]>({ queryKey: messageKeyPrefix });
  for (const [key, value] of listQueries) {
    snapshots.push([key, value]);
    if (!value) continue;
    qc.setQueryData<Message[]>(
      key,
      value.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
    );
  }

  const detailKey = qk.message(accountId, messageId);
  const detailPrev = qc.getQueryData<Message>(detailKey);
  if (detailPrev) {
    snapshots.push([detailKey, [detailPrev]]);
    qc.setQueryData<Message>(detailKey, { ...detailPrev, ...patch });
  }

  return () => {
    for (const [key, value] of snapshots) {
      if (key[0] === 'message') {
        qc.setQueryData(key, value?.[0]);
      } else {
        qc.setQueryData(key, value);
      }
    }
  };
}

function removeMessageFromListCaches(
  qc: ReturnType<typeof useQueryClient>,
  accountId: string,
  messageId: string,
): () => void {
  const snapshots: Array<[readonly unknown[], Message[] | undefined]> = [];
  const listQueries = qc.getQueriesData<Message[]>({
    queryKey: ['messages', accountId],
  });
  for (const [key, value] of listQueries) {
    if (!value) continue;
    snapshots.push([key, value]);
    qc.setQueryData<Message[]>(
      key,
      value.filter((m) => m.id !== messageId),
    );
  }
  return () => {
    for (const [key, value] of snapshots) qc.setQueryData(key, value);
  };
}

export function useMarkRead(accountId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { messageId: string; isRead: boolean }) => {
      if (!accountId) throw new Error('no account');
      await api.markRead(accountId, input.messageId, input.isRead);
    },
    onMutate: async ({ messageId, isRead }) => {
      if (!accountId) return;
      const rollback = patchMessageInCaches(qc, accountId, messageId, { isRead });
      return { rollback };
    },
    onError: (_err, _vars, ctx) => ctx?.rollback?.(),
  });
}

export function useMarkFlagged(accountId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { messageId: string; isFlagged: boolean }) => {
      if (!accountId) throw new Error('no account');
      await api.markFlagged(accountId, input.messageId, input.isFlagged);
    },
    onMutate: async ({ messageId, isFlagged }) => {
      if (!accountId) return;
      const rollback = patchMessageInCaches(qc, accountId, messageId, { isFlagged });
      return { rollback };
    },
    onError: (_err, _vars, ctx) => ctx?.rollback?.(),
  });
}

export function useDeleteMessage(accountId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { messageId: string }) => {
      if (!accountId) throw new Error('no account');
      return api.deleteMessage(accountId, input.messageId);
    },
    onMutate: async ({ messageId }) => {
      if (!accountId) return;
      await qc.cancelQueries({ queryKey: ['messages', accountId] });
      const rollback = removeMessageFromListCaches(qc, accountId, messageId);
      return { rollback };
    },
    onError: (_err, _vars, ctx) => ctx?.rollback?.(),
    onSettled: () => {
      if (!accountId) return;
      void qc.invalidateQueries({ queryKey: ['messages', accountId] });
      void qc.invalidateQueries({ queryKey: qk.mailboxes(accountId) });
    },
  });
}

export function useMoveMessage(accountId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { messageId: string; targetMailboxId: string }) => {
      if (!accountId) throw new Error('no account');
      return api.moveMessage(accountId, input.messageId, input.targetMailboxId);
    },
    onMutate: async ({ messageId }) => {
      if (!accountId) return;
      await qc.cancelQueries({ queryKey: ['messages', accountId] });
      const rollback = removeMessageFromListCaches(qc, accountId, messageId);
      return { rollback };
    },
    onError: (_err, _vars, ctx) => ctx?.rollback?.(),
    onSettled: () => {
      if (!accountId) return;
      void qc.invalidateQueries({ queryKey: ['messages', accountId] });
      void qc.invalidateQueries({ queryKey: qk.mailboxes(accountId) });
    },
  });
}
