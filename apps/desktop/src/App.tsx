import { useState } from 'react';
import type { Account, AccountProvider } from '@aegismail/core';

const PROVIDERS: { id: AccountProvider; label: string }[] = [
  { id: 'outlook', label: 'Outlook' },
  { id: 'gmail', label: 'Gmail' },
  { id: 'icloud', label: 'iCloud' },
];

export function App() {
  const [accounts] = useState<Account[]>([]);

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-lg font-semibold tracking-tight">AegisMail</h1>
        <p className="text-sm text-neutral-500">Unified mail for Outlook, Gmail, and iCloud.</p>
      </header>

      <section className="flex-1 p-6 grid gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Connect an account
        </h2>
        <div className="flex gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="px-3 py-2 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-sm"
            >
              Connect {p.label}
            </button>
          ))}
        </div>

        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 mt-4">
          Accounts
        </h2>
        {accounts.length === 0 ? (
          <p className="text-sm text-neutral-500">No accounts connected yet.</p>
        ) : (
          <ul className="grid gap-2">
            {accounts.map((a) => (
              <li key={a.id} className="text-sm">
                {a.displayName} — {a.provider}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
