import {
  Inbox,
  Send,
  FileText,
  Archive,
  Trash2,
  AlertOctagon,
  Folder,
  Star,
  Plus,
  Tag,
  X,
} from 'lucide-react';
import type { Account, Mailbox } from '@aegismail/core';
import { useMailboxes, useDeleteAccount } from '../api/hooks.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';
import { ACCOUNT_COLORS, ACCOUNT_INITIALS, MAILBOX_COLORS } from '../themes.ts';

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

const ROLE_ICON: Record<Mailbox['role'], typeof Inbox> = {
  inbox: Inbox,
  sent: Send,
  drafts: FileText,
  archive: Archive,
  trash: Trash2,
  spam: AlertOctagon,
  other: Folder,
};

function sortMailboxes(boxes: Mailbox[]): Mailbox[] {
  return [...boxes].sort((a, b) => {
    const diff = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
}

function SectionLabel({ children }: { children: string }) {
  const { theme } = useTheme();
  return (
    <div
      className="px-2 pt-4 pb-1.5 text-[10px] font-bold tracking-widest"
      style={{ color: theme.textDim }}
    >
      {children}
    </div>
  );
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
  const { theme } = useTheme();

  const { data: mailboxes = [], isLoading, error } = useMailboxes(selectedAccountId);
  const { mutate: deleteAccount, isPending: deleting } = useDeleteAccount();

  return (
    <aside
      className="w-60 shrink-0 flex flex-col"
      style={{
        background: theme.panel,
        borderRight: `1px solid ${theme.border}`,
        color: theme.text,
      }}
    >
      <div className="p-3">
        <button
          type="button"
          disabled
          title="Compose — SMTP support coming in a later phase"
          className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: theme.accent, color: theme.accentContrast }}
        >
          <Plus size={14} /> Compose
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <SectionLabel>ACCOUNTS</SectionLabel>
        <ul>
          {accounts.map((a) => {
            const accentColor = ACCOUNT_COLORS[a.provider] ?? theme.accent;
            const initial = ACCOUNT_INITIALS[a.provider] ?? a.displayName[0] ?? '?';
            const active = a.id === selectedAccountId;
            return (
              <li
                key={a.id}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] mb-0.5"
                style={{
                  background: active ? theme.panelAlt : 'transparent',
                  fontWeight: active ? 600 : 500,
                  color: active ? theme.text : theme.textDim,
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelectAccount(a.id)}
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                >
                  <span
                    className="w-[18px] h-[18px] rounded shrink-0 text-[10px] font-bold flex items-center justify-center text-white"
                    style={{ background: accentColor }}
                  >
                    {initial}
                  </span>
                  <span className="truncate">{a.displayName}</span>
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    if (confirm(`Remove ${a.displayName}?`)) deleteAccount(a.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  style={{ color: theme.textDim }}
                  aria-label={`Remove ${a.displayName}`}
                >
                  <X size={12} />
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={onAddAccount}
              className="w-full text-left px-2 py-1.5 rounded-md text-[13px] flex items-center gap-2"
              style={{ color: theme.textDim }}
            >
              <Plus size={12} /> Add account
            </button>
          </li>
        </ul>

        <SectionLabel>MAILBOXES</SectionLabel>
        {!selectedAccountId ? (
          <p className="px-2 py-1 text-xs" style={{ color: theme.textDim }}>
            Select an account.
          </p>
        ) : isLoading ? (
          <p className="px-2 py-1 text-xs" style={{ color: theme.textDim }}>
            Loading…
          </p>
        ) : error ? (
          <p className="px-2 py-1 text-xs text-red-500">
            {error instanceof Error ? error.message : String(error)}
          </p>
        ) : (
          <ul>
            {sortMailboxes(mailboxes).map((mb) => {
              const Icon = ROLE_ICON[mb.role];
              const color = MAILBOX_COLORS[mb.role] ?? MAILBOX_COLORS['other']!;
              const active = mb.id === selectedMailboxId;
              return (
                <li key={mb.id}>
                  <button
                    type="button"
                    onClick={() => onSelectMailbox(mb.id)}
                    className="w-full text-left px-2 py-1.5 rounded-md text-[13px] flex items-center gap-2.5 mb-0.5"
                    style={{
                      background: active ? theme.panelAlt : 'transparent',
                      fontWeight: active ? 600 : 500,
                      color: active ? theme.text : theme.textDim,
                    }}
                  >
                    <Icon size={14} color={color} />
                    <span className="flex-1 truncate">{mb.name}</span>
                    {mb.unreadCount > 0 && (
                      <span
                        className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-semibold"
                        style={{ background: theme.panelAlt, color: theme.textDim }}
                      >
                        {mb.unreadCount}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <SectionLabel>LABELS</SectionLabel>
        <p className="px-2 py-1 text-[11px]" style={{ color: theme.textDim }}>
          <Tag size={10} className="inline mr-1" />
          Custom labels coming soon.
        </p>

        <SectionLabel>FLAGGED</SectionLabel>
        <p className="px-2 py-1 text-[11px]" style={{ color: theme.textDim }}>
          <Star size={10} className="inline mr-1" />
          Cross-mailbox flagged view coming soon.
        </p>
      </div>
    </aside>
  );
}
