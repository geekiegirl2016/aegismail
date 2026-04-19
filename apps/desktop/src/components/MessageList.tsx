import { useEffect, useMemo } from 'react';
import { Paperclip, Star, ListFilter } from 'lucide-react';
import type { Account, Mailbox, Message } from '@aegismail/core';
import { useMessages, usePrefetchMessage } from '../api/hooks.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';
import { ACCOUNT_COLORS } from '../themes.ts';

interface Props {
  accounts: Account[];
  mailboxes: Mailbox[];
  accountId: string | null;
  mailboxId: string | null;
  selectedMessageId: string | null;
  search: string;
  onSelect: (messageId: string) => void;
}

const PREFETCH_ON_LOAD = 10;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = Date.now();
  const diffHours = (now - d.getTime()) / 36e5;
  if (diffHours < 24)
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (diffHours < 24 * 7)
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function senderName(msg: Message): string {
  return msg.from.name || msg.from.address;
}

export function MessageList(props: Props) {
  const { accounts, mailboxes, accountId, mailboxId, selectedMessageId, search, onSelect } =
    props;
  const { theme, density } = useTheme();
  const { data: rawMessages = [], isLoading, error } = useMessages(accountId, mailboxId);
  const prefetch = usePrefetchMessage(accountId);

  const account = accounts.find((a) => a.id === accountId);
  const mailbox = mailboxes.find((m) => m.id === mailboxId);
  const accountColor = account ? ACCOUNT_COLORS[account.provider] : undefined;

  const messages = useMemo(() => {
    if (!search.trim()) return rawMessages;
    const s = search.toLowerCase();
    return rawMessages.filter(
      (m) =>
        m.subject.toLowerCase().includes(s) ||
        senderName(m).toLowerCase().includes(s) ||
        m.snippet.toLowerCase().includes(s),
    );
  }, [rawMessages, search]);

  useEffect(() => {
    if (!accountId || messages.length === 0) return;
    for (const m of messages.slice(0, PREFETCH_ON_LOAD)) prefetch(m.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, mailboxId, messages.length]);

  const paddingY =
    density === 'compact' ? 'py-2' : density === 'spacious' ? 'py-4' : 'py-3';

  return (
    <div
      className="w-96 shrink-0 flex flex-col"
      style={{ background: theme.bg, borderRight: `1px solid ${theme.border}` }}
    >
      <div
        className="px-4 py-3.5 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${theme.border}` }}
      >
        <div>
          <div className="text-[15px] font-bold" style={{ color: theme.text }}>
            {mailbox?.name ?? 'Inbox'}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: theme.textDim }}>
            {messages.length} message{messages.length === 1 ? '' : 's'}
            {messages.length > 0 && (
              <>
                {' · '}
                {messages.filter((m) => !m.isRead).length} unread
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] border"
          style={{ color: theme.textDim, borderColor: theme.border }}
          title="Sort options coming soon"
          disabled
        >
          <ListFilter size={11} /> Sort
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!accountId || !mailboxId ? (
          <div className="p-6 text-sm" style={{ color: theme.textDim }}>
            Select a mailbox.
          </div>
        ) : isLoading ? (
          <div className="p-6 text-sm" style={{ color: theme.textDim }}>
            Loading messages…
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-500">
            {error instanceof Error ? error.message : String(error)}
          </div>
        ) : messages.length === 0 ? (
          <div className="p-6 text-sm" style={{ color: theme.textDim }}>
            {search ? 'No matches.' : 'Mailbox empty.'}
          </div>
        ) : (
          <ul>
            {messages.map((m) => {
              const selected = m.id === selectedMessageId;
              const stripe = selected
                ? theme.accent
                : m.isRead
                  ? 'transparent'
                  : accountColor ?? theme.accent;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(m.id)}
                    onMouseEnter={() => prefetch(m.id)}
                    onFocus={() => prefetch(m.id)}
                    className={`w-full text-left px-4 ${paddingY} flex flex-col gap-0.5`}
                    style={{
                      background: selected ? theme.panel : 'transparent',
                      borderBottom: `1px solid ${theme.border}`,
                      borderLeft: `3px solid ${stripe}`,
                    }}
                  >
                    <div className="flex items-baseline gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          background: m.isRead ? 'transparent' : theme.accent,
                        }}
                      />
                      <span
                        className="flex-1 truncate text-[13px]"
                        style={{
                          color: theme.text,
                          fontWeight: m.isRead ? 500 : 700,
                        }}
                      >
                        {senderName(m)}
                      </span>
                      <span
                        className="text-[11px] shrink-0 tabular-nums"
                        style={{ color: theme.textDim }}
                      >
                        {formatDate(m.receivedAt)}
                      </span>
                    </div>
                    <div
                      className="pl-3.5 truncate text-[12px]"
                      style={{
                        color: theme.text,
                        fontWeight: m.isRead ? 400 : 600,
                      }}
                    >
                      {m.subject || '(no subject)'}
                    </div>
                    {density !== 'compact' && m.snippet && (
                      <div
                        className="pl-3.5 truncate text-[11px]"
                        style={{ color: theme.textDim }}
                      >
                        {m.snippet}
                      </div>
                    )}
                    <div className="pl-3.5 mt-0.5 flex items-center gap-1.5">
                      {accountColor && (
                        <span
                          className="w-1 h-1 rounded-full"
                          style={{ background: accountColor }}
                        />
                      )}
                      {account && (
                        <span className="text-[10px]" style={{ color: theme.textDim }}>
                          {account.emailAddress.split('@')[1]}
                        </span>
                      )}
                      {m.hasAttachments && (
                        <>
                          <Paperclip size={9} color={theme.textDim} />
                        </>
                      )}
                      {m.isFlagged && <Star size={10} color="#F59E0B" fill="#F59E0B" />}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
