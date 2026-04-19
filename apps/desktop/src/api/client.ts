import { invoke } from '@tauri-apps/api/core';
import type { Account, Mailbox, Message } from '@aegismail/core';

const SERVER_BASE = 'http://127.0.0.1:8787';

let tokenPromise: Promise<string> | null = null;

function loadToken(): Promise<string> {
  if (tokenPromise) return tokenPromise;
  tokenPromise = invoke<string>('get_server_token').catch((err: unknown) => {
    tokenPromise = null;
    throw new Error(
      `Could not read the AegisMail bearer token from the Keychain. ` +
        `Is the server running? (${String(err)})`,
    );
  });
  return tokenPromise;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly data: unknown;

  constructor(status: number, code: string, message: string, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = await loadToken();
  const url = new URL(path, SERVER_BASE);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
  };
  let body: string | undefined;
  if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers['content-type'] = 'application/json';
  }

  const init: RequestInit = { method, headers };
  if (body !== undefined) init.body = body;
  if (opts.signal) init.signal = opts.signal;

  const res = await fetch(url.toString(), init);

  if (res.status === 204) return undefined as T;

  const raw = await res.text();
  const parsed: unknown = raw ? (JSON.parse(raw) as unknown) : undefined;

  if (!res.ok) {
    const errBody =
      parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    const code = typeof errBody['error'] === 'string' ? errBody['error'] : 'unknown';
    const msg = typeof errBody['message'] === 'string' ? errBody['message'] : res.statusText;
    throw new ApiError(res.status, code, msg, parsed);
  }

  return parsed as T;
}

// --- Typed endpoints ---

export const api = {
  listAccounts: () => request<{ accounts: Account[] }>('/v1/accounts'),

  createAccount: (input: {
    provider: 'icloud';
    displayName: string;
    emailAddress: string;
    appPassword: string;
  }) => request<{ account: Account }>('/v1/accounts', { method: 'POST', body: input }),

  deleteAccount: (id: string) =>
    request<void>(`/v1/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  listMailboxes: (accountId: string) =>
    request<{ mailboxes: Mailbox[] }>(
      `/v1/accounts/${encodeURIComponent(accountId)}/mailboxes`,
    ),

  listMessages: (
    accountId: string,
    mailboxId: string,
    options: { limit?: number; pageToken?: string } = {},
  ) =>
    request<{ messages: Message[]; nextPageToken?: string }>(
      `/v1/accounts/${encodeURIComponent(accountId)}/mailboxes/${encodeURIComponent(
        mailboxId,
      )}/messages`,
      { query: { limit: options.limit, pageToken: options.pageToken } },
    ),

  getMessage: (accountId: string, messageId: string) =>
    request<{ message: Message }>(
      `/v1/accounts/${encodeURIComponent(accountId)}/messages/${encodeURIComponent(messageId)}`,
    ),

  markRead: (accountId: string, messageId: string, isRead: boolean) =>
    request<void>(
      `/v1/accounts/${encodeURIComponent(accountId)}/messages/${encodeURIComponent(messageId)}`,
      { method: 'PATCH', body: { isRead } },
    ),
};
