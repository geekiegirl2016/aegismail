import { useState, type FormEvent } from 'react';
import type { AccountProvider } from '@aegismail/core';
import { useCreateAccount } from '../api/hooks.ts';
import { ApiError } from '../api/client.ts';

interface Props {
  onConnected?: () => void;
  onCancel?: () => void;
}

interface ProviderOption {
  id: AccountProvider;
  label: string;
  available: boolean;
  note: string;
}

const PROVIDERS: readonly ProviderOption[] = [
  {
    id: 'icloud',
    label: 'iCloud',
    available: true,
    note: 'Use an app-specific password from appleid.apple.com.',
  },
  {
    id: 'gmail',
    label: 'Gmail',
    available: false,
    note: 'OAuth support is on the roadmap.',
  },
  {
    id: 'outlook',
    label: 'Outlook',
    available: false,
    note: 'Microsoft Graph support is on the roadmap.',
  },
];

export function ConnectAccountForm({ onConnected, onCancel }: Props) {
  const [provider, setProvider] = useState<AccountProvider>('icloud');
  const [displayName, setDisplayName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useCreateAccount();

  const selected = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected?.available) return;
    setError(null);
    try {
      await mutateAsync({
        provider: 'icloud',
        displayName: displayName.trim(),
        emailAddress: emailAddress.trim(),
        appPassword,
      });
      // Clear the password from React state the instant the server has it.
      setAppPassword('');
      setDisplayName('');
      setEmailAddress('');
      onConnected?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`${err.code}: ${err.message}`);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 p-6 w-full max-w-md"
      autoComplete="off"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Connect an account</h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            ← Back
          </button>
        )}
      </header>

      <div className="grid grid-cols-3 gap-2">
        {PROVIDERS.map((p) => {
          const active = p.id === provider;
          return (
            <button
              key={p.id}
              type="button"
              disabled={!p.available}
              aria-pressed={active}
              onClick={() => p.available && setProvider(p.id)}
              className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                active
                  ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                  : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900'
              } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
              title={p.available ? p.note : `${p.label}: coming soon`}
            >
              <span className="block font-medium">{p.label}</span>
              {!p.available && (
                <span className="block text-[10px] uppercase tracking-wide text-neutral-500">
                  Coming soon
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-neutral-500">
        {selected?.id === 'icloud' ? (
          <>
            Generate an{' '}
            <a
              href="https://appleid.apple.com"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              app-specific password
            </a>{' '}
            at appleid.apple.com. It stays in your macOS Keychain; AegisMail
            never logs it.
          </>
        ) : (
          selected?.note
        )}
      </p>

      <label className="grid gap-1 text-sm">
        <span className="text-neutral-500">Display name</span>
        <input
          className="px-3 py-2 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
          type="text"
          required
          disabled={!selected?.available}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Personal"
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="text-neutral-500">Email address</span>
        <input
          className="px-3 py-2 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
          type="email"
          autoComplete="username"
          required
          disabled={!selected?.available}
          value={emailAddress}
          onChange={(e) => setEmailAddress(e.target.value)}
          placeholder="you@icloud.com"
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="text-neutral-500">App-specific password</span>
        <input
          className="px-3 py-2 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-mono"
          type="password"
          autoComplete="new-password"
          required
          disabled={!selected?.available}
          value={appPassword}
          onChange={(e) => setAppPassword(e.target.value)}
          placeholder="xxxx-xxxx-xxxx-xxxx"
        />
      </label>

      {error && (
        <div
          role="alert"
          className="text-sm text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/40 rounded-md px-3 py-2"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !selected?.available}
        className="px-3 py-2 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {isPending ? 'Connecting…' : `Connect ${selected?.label ?? 'account'}`}
      </button>
    </form>
  );
}
