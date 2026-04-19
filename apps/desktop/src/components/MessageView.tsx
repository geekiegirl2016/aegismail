import { useEffect, useMemo } from 'react';
import DOMPurify, { type Config } from 'dompurify';
import {
  Archive,
  Trash2,
  Star,
  Reply,
  ReplyAll,
  Forward,
  Sparkles,
  MailOpen,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import type { Account } from '@aegismail/core';
import { useMessage, useMarkRead } from '../api/hooks.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';
import { ACCOUNT_COLORS } from '../themes.ts';

interface Props {
  accounts: Account[];
  accountId: string | null;
  messageId: string | null;
  canArchive: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onArchive: () => void;
  onToggleFlag: () => void;
  onMarkUnread: () => void;
  onOpenAi: () => void;
}

const SANITIZE_CONFIG: Config = {
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'base', 'form'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'srcset'],
  ALLOW_DATA_ATTR: false,
};

function sanitize(html: string): string {
  const clean = DOMPurify.sanitize(html, SANITIZE_CONFIG);
  return String(clean).replace(/<a\s/gi, '<a target="_blank" rel="noopener noreferrer" ');
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  primary?: boolean;
  active?: boolean;
  onClick: () => void;
}

function ActionButton({
  icon: Icon,
  label,
  shortcut,
  disabled,
  primary,
  active,
  onClick,
}: ActionButtonProps) {
  const { theme } = useTheme();
  const background = primary || active ? theme.accent : theme.panel;
  const color = primary || active ? theme.accentContrast : theme.text;
  const borderColor = primary || active ? theme.accent : theme.border;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11.5px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ background, color, borderColor }}
    >
      <Icon size={12} /> {label}
    </button>
  );
}

export function MessageView(props: Props) {
  const {
    accounts,
    accountId,
    messageId,
    canArchive,
    canDelete,
    onDelete,
    onArchive,
    onToggleFlag,
    onMarkUnread,
    onOpenAi,
  } = props;
  const { theme } = useTheme();
  const { data: message, isLoading, error } = useMessage(accountId, messageId);
  const markRead = useMarkRead(accountId);

  const account = accounts.find((a) => a.id === accountId);
  const accentColor = account ? ACCOUNT_COLORS[account.provider] : theme.accent;

  const sanitizedHtml = useMemo(
    () => (message?.bodyHtml ? sanitize(message.bodyHtml) : null),
    [message?.bodyHtml],
  );

  useEffect(() => {
    if (!message || message.isRead || !accountId || !messageId) return;
    markRead.mutate({ messageId, isRead: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message?.id]);

  if (!accountId || !messageId) {
    return (
      <div
        className="flex-1 flex items-center justify-center text-sm"
        style={{ color: theme.textDim }}
      >
        Select a message to read it.
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="flex-1 p-6 text-sm" style={{ color: theme.textDim }}>
        Loading…
      </div>
    );
  }
  if (error || !message) {
    return (
      <div className="flex-1 p-6 text-sm text-red-500">
        {error instanceof Error ? error.message : 'Could not load message.'}
      </div>
    );
  }

  const senderDisplay = message.from.name || message.from.address;

  return (
    <article className="flex-1 flex flex-col min-w-0">
      <header
        className="px-5 py-4 shrink-0"
        style={{ borderBottom: `1px solid ${theme.border}` }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h2
              className="text-[18px] font-bold leading-tight mb-2"
              style={{ color: theme.text }}
            >
              {message.subject || '(no subject)'}
            </h2>
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{ background: accentColor ?? theme.accent }}
              >
                {initials(senderDisplay)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold" style={{ color: theme.text }}>
                  {senderDisplay}
                </div>
                <div className="text-[11px] truncate" style={{ color: theme.textDim }}>
                  {message.from.address}
                  {account && ` · via ${account.provider}`}
                </div>
              </div>
              <div className="text-[11px] shrink-0" style={{ color: theme.textDim }}>
                {new Date(message.receivedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <ActionButton icon={Reply} label="Reply" disabled onClick={() => {}} />
          <ActionButton icon={ReplyAll} label="Reply all" disabled onClick={() => {}} />
          <ActionButton icon={Forward} label="Forward" disabled onClick={() => {}} />
          <ActionButton
            icon={Archive}
            label="Archive"
            shortcut="E"
            disabled={!canArchive}
            onClick={onArchive}
          />
          <ActionButton
            icon={Trash2}
            label="Delete"
            shortcut="Del"
            disabled={!canDelete}
            onClick={onDelete}
          />
          <ActionButton
            icon={Star}
            label={message.isFlagged ? 'Flagged' : 'Flag'}
            shortcut="S"
            active={message.isFlagged}
            onClick={onToggleFlag}
          />
          <ActionButton
            icon={MailOpen}
            label="Mark unread"
            shortcut="⇧⌘U"
            onClick={onMarkUnread}
          />
          <div className="flex-1" />
          <ActionButton icon={Sparkles} label="Ask AI" primary onClick={onOpenAi} />
        </div>

        {message.to.length > 0 && (
          <div className="mt-3 text-[11px] truncate" style={{ color: theme.textDim }}>
            <span className="mr-1.5">To:</span>
            {message.to.map((a) => a.name || a.address).join(', ')}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {sanitizedHtml ? (
          <div
            className="prose prose-sm max-w-3xl dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : (
          <pre
            className="whitespace-pre-wrap font-sans text-sm max-w-3xl leading-relaxed"
            style={{ color: theme.text }}
          >
            {message.bodyText ?? '(no body)'}
          </pre>
        )}

        {message.hasAttachments && (
          <div
            className="mt-4 flex items-center gap-2 text-[11px]"
            style={{ color: theme.textDim }}
          >
            <FileText size={12} /> This message has attachments. Attachment download is
            coming in a later phase.
          </div>
        )}
      </div>
    </article>
  );
}
