import { useState, type FormEvent } from 'react';
import { open as openExternal } from '@tauri-apps/plugin-shell';
import { useQueryClient } from '@tanstack/react-query';
import type { AccountProvider } from '@aegismail/core';
import { useCreateAccount, useOAuthProviders, qk } from '../api/hooks.ts';
import { api, ApiError } from '../api/client.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';

interface Props {
  onConnected?: () => void;
  onCancel?: () => void;
}

interface ProviderOption {
  id: AccountProvider;
  label: string;
  kind: 'password' | 'oauth';
  note: string;
}

const PROVIDERS: readonly ProviderOption[] = [
  {
    id: 'icloud',
    label: 'iCloud',
    kind: 'password',
    note: 'Use an app-specific password from appleid.apple.com.',
  },
  {
    id: 'gmail',
    label: 'Gmail',
    kind: 'oauth',
    note: 'Sign in with Google.',
  },
  {
    id: 'outlook',
    label: 'Outlook',
    kind: 'oauth',
    note: 'Microsoft Graph — coming in Phase 11.',
  },
];

export function ConnectAccountForm({ onConnected, onCancel }: Props) {
  const { theme } = useTheme();
  const qc = useQueryClient();
  const { data: oauthProviders } = useOAuthProviders();

  const googleConfigured =
    oauthProviders?.find((p) => p.id === 'google')?.configured ?? false;
  const microsoftConfigured =
    oauthProviders?.find((p) => p.id === 'microsoft')?.configured ?? false;

  const [provider, setProvider] = useState<AccountProvider>('icloud');
  const [displayName, setDisplayName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [oauthBusy, setOauthBusy] = useState(false);

  const { mutateAsync: createAccount, isPending: creating } = useCreateAccount();

  const available = (p: ProviderOption): boolean => {
    if (p.id === 'icloud') return true;
    if (p.id === 'gmail') return googleConfigured;
    if (p.id === 'outlook') return microsoftConfigured;
    return false;
  };

  const selected = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0]!;

  async function handleIcloudSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    try {
      await createAccount({
        provider: 'icloud',
        displayName: displayName.trim(),
        emailAddress: emailAddress.trim(),
        appPassword,
      });
      setAppPassword('');
      setDisplayName('');
      setEmailAddress('');
      onConnected?.();
    } catch (err) {
      handleError(err);
    }
  }

  async function handleGmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOauthBusy(true);
    try {
      const { sessionId, authUrl } = await api.startGoogleOAuth({
        displayName: displayName.trim(),
        ...(emailAddress.trim() ? { loginHint: emailAddress.trim() } : {}),
      });
      await openExternal(authUrl);
      const { account } = await api.awaitGoogleOAuth(sessionId);
      await qc.invalidateQueries({ queryKey: qk.accounts });
      setDisplayName('');
      setEmailAddress('');
      onConnected?.();
      void account;
    } catch (err) {
      handleError(err);
    } finally {
      setOauthBusy(false);
    }
  }

  function handleError(err: unknown): void {
    if (err instanceof ApiError) {
      setError(`${err.code}: ${err.message}`);
    } else {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const handleSubmit =
    selected.kind === 'oauth' ? handleGmailSubmit : handleIcloudSubmit;

  const busy = creating || oauthBusy;

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 p-6 w-full max-w-md"
      autoComplete="off"
      style={{ color: theme.text }}
    >
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Connect an account</h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm"
            style={{ color: theme.textDim }}
          >
            ← Back
          </button>
        )}
      </header>

      <div className="grid grid-cols-3 gap-2">
        {PROVIDERS.map((p) => {
          const active = p.id === provider;
          const isAvailable = available(p);
          return (
            <button
              key={p.id}
              type="button"
              disabled={!isAvailable}
              aria-pressed={active}
              onClick={() => isAvailable && setProvider(p.id)}
              className="px-3 py-2 rounded-md border text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: active ? theme.accent : theme.border,
                background: active ? theme.accent : 'transparent',
                color: active ? theme.accentContrast : theme.text,
              }}
              title={isAvailable ? p.note : `${p.label}: not configured yet`}
            >
              <span className="block font-medium">{p.label}</span>
              {!isAvailable && (
                <span
                  className="block text-[10px] uppercase tracking-wide"
                  style={{ color: theme.textDim }}
                >
                  {p.id === 'outlook' ? 'Coming soon' : 'Not configured'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-sm" style={{ color: theme.textDim }}>
        {selected.id === 'icloud' ? (
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
        ) : selected.id === 'gmail' ? (
          googleConfigured ? (
            'We\'ll open Google in your browser for you to sign in. Tokens land in the macOS Keychain.'
          ) : (
            <>
              Google OAuth isn't configured for this install. See{' '}
              <code>docs/oauth-setup.md</code> and set the{' '}
              <code>AEGIS_GOOGLE_OAUTH_CLIENT_ID</code> /{' '}
              <code>AEGIS_GOOGLE_OAUTH_CLIENT_SECRET</code> env vars.
            </>
          )
        ) : (
          selected.note
        )}
      </p>

      <label className="grid gap-1 text-sm">
        <span style={{ color: theme.textDim }}>Display name</span>
        <input
          className="px-3 py-2 rounded-md border"
          type="text"
          required
          disabled={!available(selected) || busy}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Personal"
          style={{
            background: theme.panelAlt,
            borderColor: theme.border,
            color: theme.text,
          }}
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span style={{ color: theme.textDim }}>
          Email address{selected.kind === 'oauth' ? ' (optional, pre-fills consent)' : ''}
        </span>
        <input
          className="px-3 py-2 rounded-md border"
          type="email"
          autoComplete="username"
          required={selected.kind === 'password'}
          disabled={!available(selected) || busy}
          value={emailAddress}
          onChange={(e) => setEmailAddress(e.target.value)}
          placeholder={selected.id === 'gmail' ? 'you@gmail.com' : 'you@icloud.com'}
          style={{
            background: theme.panelAlt,
            borderColor: theme.border,
            color: theme.text,
          }}
        />
      </label>

      {selected.kind === 'password' && (
        <label className="grid gap-1 text-sm">
          <span style={{ color: theme.textDim }}>App-specific password</span>
          <input
            className="px-3 py-2 rounded-md border font-mono"
            type="password"
            autoComplete="new-password"
            required
            disabled={busy}
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            placeholder="xxxx-xxxx-xxxx-xxxx"
            style={{
              background: theme.panelAlt,
              borderColor: theme.border,
              color: theme.text,
            }}
          />
        </label>
      )}

      {error && (
        <div
          role="alert"
          className="text-sm rounded-md px-3 py-2"
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#FCA5A5',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy || !available(selected)}
        className="px-3 py-2 rounded-md text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: theme.accent, color: theme.accentContrast }}
      >
        {busy
          ? selected.kind === 'oauth'
            ? 'Waiting for browser…'
            : 'Connecting…'
          : selected.kind === 'oauth'
            ? `Sign in with ${selected.label}`
            : `Connect ${selected.label}`}
      </button>

      {oauthBusy && (
        <p className="text-xs text-center" style={{ color: theme.textDim }}>
          Complete sign-in in your browser, then come back here.
        </p>
      )}
    </form>
  );
}
