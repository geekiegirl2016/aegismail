import { useState, type FormEvent } from 'react';
import { useCreateAccount } from '../api/hooks.ts';
import { ApiError } from '../api/client.ts';

interface Props {
  onConnected?: () => void;
}

export function ConnectAccountForm({ onConnected }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useCreateAccount();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      className="grid gap-3 p-6 max-w-md"
      autoComplete="off"
    >
      <h2 className="text-lg font-semibold">Connect an iCloud account</h2>
      <p className="text-sm text-neutral-500">
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
      </p>

      <label className="grid gap-1 text-sm">
        <span className="text-neutral-500">Display name</span>
        <input
          className="px-3 py-2 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
          type="text"
          required
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
        disabled={isPending}
        className="px-3 py-2 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 text-sm"
      >
        {isPending ? 'Connecting…' : 'Connect'}
      </button>
    </form>
  );
}
