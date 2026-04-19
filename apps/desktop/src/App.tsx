import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Message } from '@aegismail/core';
import {
  qk,
  useAccounts,
  useDeleteMessage,
  useMailboxes,
  useMarkFlagged,
  useMarkRead,
  useMoveMessage,
} from './api/hooks.ts';
import { ConnectAccountForm } from './components/ConnectAccountForm.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { MessageList } from './components/MessageList.tsx';
import { MessageView } from './components/MessageView.tsx';
import { TitleBar } from './components/TitleBar.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { AiPanel } from './components/AiPanel.tsx';
import { useTheme } from './contexts/ThemeContext.tsx';

export function App() {
  const { theme } = useTheme();
  const { data: accounts = [], isLoading, error } = useAccounts();
  const qc = useQueryClient();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedMailboxId, setSelectedMailboxId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: mailboxes = [] } = useMailboxes(selectedAccountId);
  const archiveMailbox = mailboxes.find((m) => m.role === 'archive');
  const trashMailbox = mailboxes.find((m) => m.role === 'trash');

  useEffect(() => {
    if (!selectedAccountId && accounts[0]) setSelectedAccountId(accounts[0].id);
  }, [accounts, selectedAccountId]);

  // When mailboxes load, pick Inbox by default.
  useEffect(() => {
    if (!selectedMailboxId && mailboxes.length > 0) {
      const inbox = mailboxes.find((m) => m.role === 'inbox') ?? mailboxes[0];
      if (inbox) setSelectedMailboxId(inbox.id);
    }
  }, [mailboxes, selectedMailboxId]);

  useEffect(() => {
    setSelectedMailboxId(null);
    setSelectedMessageId(null);
  }, [selectedAccountId]);
  useEffect(() => {
    setSelectedMessageId(null);
  }, [selectedMailboxId]);

  const markRead = useMarkRead(selectedAccountId);
  const markFlagged = useMarkFlagged(selectedAccountId);
  const deleteMessage = useDeleteMessage(selectedAccountId);
  const moveMessage = useMoveMessage(selectedAccountId);

  const computeNextSelection = useCallback(
    (messageId: string): string | null => {
      if (!selectedAccountId || !selectedMailboxId) return null;
      const list = qc.getQueryData<Message[]>(
        qk.messages(selectedAccountId, selectedMailboxId),
      );
      if (!list) return null;
      const idx = list.findIndex((m) => m.id === messageId);
      if (idx < 0) return null;
      return list[idx + 1]?.id ?? list[idx - 1]?.id ?? null;
    },
    [qc, selectedAccountId, selectedMailboxId],
  );

  const currentMessage = useMemo(() => {
    if (!selectedAccountId || !selectedMessageId || !selectedMailboxId) return null;
    const list = qc.getQueryData<Message[]>(
      qk.messages(selectedAccountId, selectedMailboxId),
    );
    return list?.find((m) => m.id === selectedMessageId) ?? null;
  }, [qc, selectedAccountId, selectedMailboxId, selectedMessageId]);

  const handleDelete = useCallback(() => {
    if (!selectedMessageId) return;
    const next = computeNextSelection(selectedMessageId);
    setSelectedMessageId(next);
    deleteMessage.mutate({ messageId: selectedMessageId });
  }, [selectedMessageId, computeNextSelection, deleteMessage]);

  const handleArchive = useCallback(() => {
    if (!selectedMessageId || !archiveMailbox) return;
    const next = computeNextSelection(selectedMessageId);
    setSelectedMessageId(next);
    moveMessage.mutate({
      messageId: selectedMessageId,
      targetMailboxId: archiveMailbox.id,
    });
  }, [selectedMessageId, archiveMailbox, computeNextSelection, moveMessage]);

  const handleToggleFlag = useCallback(() => {
    if (!selectedMessageId || !currentMessage) return;
    markFlagged.mutate({
      messageId: selectedMessageId,
      isFlagged: !currentMessage.isFlagged,
    });
  }, [selectedMessageId, currentMessage, markFlagged]);

  const handleMarkUnread = useCallback(() => {
    if (!selectedMessageId) return;
    markRead.mutate({ messageId: selectedMessageId, isRead: false });
    setSelectedMessageId(null);
  }, [selectedMessageId, markRead]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selectedMessageId) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'e' || e.key === 'E') {
        if (archiveMailbox) {
          e.preventDefault();
          handleArchive();
        }
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleToggleFlag();
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key === 'U' || e.key === 'u')
      ) {
        e.preventDefault();
        handleMarkUnread();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    selectedMessageId,
    archiveMailbox,
    handleDelete,
    handleArchive,
    handleToggleFlag,
    handleMarkUnread,
  ]);

  const rootStyle = {
    background: theme.bg,
    color: theme.text,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  };

  if (isLoading) {
    return (
      <main
        className="h-screen flex items-center justify-center text-sm"
        style={{ ...rootStyle, color: theme.textDim }}
      >
        Loading…
      </main>
    );
  }

  if (error) {
    return (
      <main
        className="h-screen flex items-center justify-center p-6 text-sm"
        style={rootStyle}
      >
        <div className="max-w-md text-center">
          <p className="text-red-500 mb-2">Could not reach the AegisMail server.</p>
          <p style={{ color: theme.textDim }}>
            The bundled server should start automatically. If this keeps happening,
            quit AegisMail and reopen it.
          </p>
          <p className="text-xs mt-4" style={{ color: theme.textDim }}>
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      </main>
    );
  }

  if (accounts.length === 0 || showConnect) {
    return (
      <main
        className="h-screen flex flex-col"
        style={rootStyle}
      >
        <TitleBar
          search=""
          onSearchChange={() => {}}
          onOpenSettings={() => setShowSettings(true)}
          aiOpen={false}
          onToggleAi={() => {}}
        />
        <div className="flex-1 grid place-items-center">
          <ConnectAccountForm
            onConnected={() => setShowConnect(false)}
            {...(accounts.length > 0 ? { onCancel: () => setShowConnect(false) } : {})}
          />
        </div>
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col overflow-hidden" style={rootStyle}>
      <TitleBar
        search={search}
        onSearchChange={setSearch}
        onOpenSettings={() => setShowSettings(true)}
        aiOpen={aiOpen}
        onToggleAi={() => setAiOpen((o) => !o)}
      />
      <div className="flex-1 flex min-h-0">
        <Sidebar
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          selectedMailboxId={selectedMailboxId}
          onSelectAccount={setSelectedAccountId}
          onSelectMailbox={setSelectedMailboxId}
          onAddAccount={() => setShowConnect(true)}
        />
        <MessageList
          accounts={accounts}
          mailboxes={mailboxes}
          accountId={selectedAccountId}
          mailboxId={selectedMailboxId}
          selectedMessageId={selectedMessageId}
          search={search}
          onSelect={setSelectedMessageId}
        />
        <MessageView
          accounts={accounts}
          accountId={selectedAccountId}
          messageId={selectedMessageId}
          canArchive={!!archiveMailbox}
          canDelete={!!trashMailbox}
          onDelete={handleDelete}
          onArchive={handleArchive}
          onToggleFlag={handleToggleFlag}
          onMarkUnread={handleMarkUnread}
          onOpenAi={() => setAiOpen(true)}
        />
        {aiOpen && <AiPanel onClose={() => setAiOpen(false)} />}
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </main>
  );
}
