import type { Message } from '@aegismail/core';
import { useMessages } from '../api/hooks.ts';

interface Props {
  accountId: string | null;
  mailboxId: string | null;
  selectedMessageId: string | null;
  onSelect: (messageId: string) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function senderName(msg: Message): string {
  return msg.from.name || msg.from.address;
}

export function MessageList(props: Props) {
  const { accountId, mailboxId, selectedMessageId, onSelect } = props;
  const { data: messages = [], isLoading, error } = useMessages(accountId, mailboxId);

  if (!accountId || !mailboxId) {
    return (
      <div className="flex-1 p-6 text-sm text-neutral-500">
        Select a mailbox to view messages.
      </div>
    );
  }
  if (isLoading) {
    return <div className="flex-1 p-6 text-sm text-neutral-500">Loading messages…</div>;
  }
  if (error) {
    return (
      <div className="flex-1 p-6 text-sm text-red-500">
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }
  if (messages.length === 0) {
    return <div className="flex-1 p-6 text-sm text-neutral-500">Mailbox empty.</div>;
  }

  return (
    <div className="w-96 shrink-0 border-r border-neutral-200 dark:border-neutral-800 overflow-y-auto">
      <ul>
        {messages.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onSelect(m.id)}
              className={`w-full text-left px-4 py-3 border-b border-neutral-100 dark:border-neutral-900 ${
                m.id === selectedMessageId
                  ? 'bg-neutral-100 dark:bg-neutral-900'
                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-950/40'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={`truncate ${
                    m.isRead ? 'text-neutral-700 dark:text-neutral-300' : 'font-semibold'
                  }`}
                >
                  {senderName(m)}
                </span>
                <span className="text-xs text-neutral-500 shrink-0 tabular-nums">
                  {formatDate(m.receivedAt)}
                </span>
              </div>
              <div
                className={`truncate text-sm ${
                  m.isRead ? 'text-neutral-500' : 'text-neutral-900 dark:text-neutral-100'
                }`}
              >
                {m.subject || '(no subject)'}
              </div>
              {m.snippet && (
                <div className="truncate text-xs text-neutral-500 mt-0.5">
                  {m.snippet}
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
