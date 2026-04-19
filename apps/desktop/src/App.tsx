import { useEffect, useState } from 'react';
import { useAccounts } from './api/hooks.ts';
import { ConnectAccountForm } from './components/ConnectAccountForm.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { MessageList } from './components/MessageList.tsx';
import { MessageView } from './components/MessageView.tsx';

export function App() {
  const { data: accounts = [], isLoading, error } = useAccounts();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedMailboxId, setSelectedMailboxId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState(false);

  // Auto-select the first account once loaded.
  useEffect(() => {
    if (!selectedAccountId && accounts[0]) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // Reset selections when switching account or mailbox.
  useEffect(() => {
    setSelectedMailboxId(null);
    setSelectedMessageId(null);
  }, [selectedAccountId]);
  useEffect(() => {
    setSelectedMessageId(null);
  }, [selectedMailboxId]);

  if (isLoading) {
    return (
      <main className="min-h-screen grid place-items-center text-sm text-neutral-500">
        Loading…
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen grid place-items-center p-6 text-sm">
        <div className="max-w-md text-center">
          <p className="text-red-600 mb-2">Could not reach the AegisMail server.</p>
          <p className="text-neutral-500">
            Start it with{' '}
            <code className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
              pnpm --filter @aegismail/server dev
            </code>{' '}
            and reopen AegisMail.
          </p>
          <p className="text-xs text-neutral-500 mt-4">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      </main>
    );
  }

  if (accounts.length === 0 || showConnect) {
    return (
      <main className="min-h-screen grid place-items-center">
        <ConnectAccountForm
          onConnected={() => setShowConnect(false)}
        />
      </main>
    );
  }

  return (
    <main className="h-screen flex">
      <Sidebar
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        selectedMailboxId={selectedMailboxId}
        onSelectAccount={setSelectedAccountId}
        onSelectMailbox={setSelectedMailboxId}
        onAddAccount={() => setShowConnect(true)}
      />
      <MessageList
        accountId={selectedAccountId}
        mailboxId={selectedMailboxId}
        selectedMessageId={selectedMessageId}
        onSelect={setSelectedMessageId}
      />
      <MessageView accountId={selectedAccountId} messageId={selectedMessageId} />
    </main>
  );
}
