import type { Account, Mailbox } from '@aegismail/core';
import { useMailboxes, useDeleteAccount } from '../api/hooks.ts';

interface Props {
  accounts: Account[];
  selectedAccountId: string | null;
  selectedMailboxId: string | null;
  onSelectAccount: (accountId: string) => void;
  onSelectMailbox: (mailboxId: string) => void;
  onAddAccount: () => void;
}

const ROLE_ORDER: Record<Mailbox['role'], number> = {
  inbox: 0,
  sent: 1,
  drafts: 2,
  archive: 3,
  spam: 4,
  trash: 5,
  other: 6,
};

function sortMailboxes(boxes: Mailbox[]): Mailbox[] {
  return [...boxes].sort((a, b) => {
    const diff = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
}

export function Sidebar(props: Props) {
  const {
    accounts,
    selectedAccountId,
    selectedMailboxId,
    onSelectAccount,
    onSelectMailbox,
    onAddAccount,
  } = props;

  const { data: mailboxes = [], isLoading, error } = useMailboxes(selectedAccountId);
  const { mutate: deleteAccount, isPending: deleting } = useDeleteAccount();

  return (
    <aside className="w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40 flex flex-col">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
          Accounts
        </h2>
        <ul className="grid gap-1">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              <button
                onClick={() => onSelectAccount(a.id)}
                className={`flex-1 text-left px-2 py-1 rounded text-sm truncate ${
                  a.id === selectedAccountId
                    ? 'bg-neutral-200 dark:bg-neutral-800'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-900'
                }`}
                title={a.emailAddress}
              >
                {a.displayName}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  if (confirm(`Remove ${a.displayName}?`)) deleteAccount(a.id);
                }}
                className="text-neutral-400 hover:text-red-600 text-xs px-1"
                aria-label={`Remove ${a.displayName}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onAddAccount}
          className="mt-2 w-full text-left px-2 py-1 rounded text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
        >
          + Add account
        </button>
      </div>

      <div className="p-3 flex-1 overflow-y-auto">
        <h2 className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
          Mailboxes
        </h2>
        {!selectedAccountId ? (
          <p className="text-sm text-neutral-500">Select an account.</p>
        ) : isLoading ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-500">{String(error)}</p>
        ) : (
          <ul className="grid gap-0.5">
            {sortMailboxes(mailboxes).map((mb) => (
              <li key={mb.id}>
                <button
                  onClick={() => onSelectMailbox(mb.id)}
                  className={`w-full text-left px-2 py-1 rounded text-sm flex justify-between items-center ${
                    mb.id === selectedMailboxId
                      ? 'bg-neutral-200 dark:bg-neutral-800 font-medium'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-900'
                  }`}
                >
                  <span className="truncate">{mb.name}</span>
                  {mb.unreadCount > 0 && (
                    <span className="text-xs text-neutral-500 tabular-nums">
                      {mb.unreadCount}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
