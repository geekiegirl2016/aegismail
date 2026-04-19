import { useEffect, useMemo } from 'react';
import DOMPurify, { type Config } from 'dompurify';
import { useMessage, useMarkRead } from '../api/hooks.ts';

interface Props {
  accountId: string | null;
  messageId: string | null;
}

/**
 * Strip active content and neutralise remote resources. Any remaining
 * <a> tags are forced to open in a new window with noopener so nothing
 * can hijack the Tauri webview.
 */
const SANITIZE_CONFIG: Config = {
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'base', 'form'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'srcset'],
  ALLOW_DATA_ATTR: false,
};

function sanitize(html: string): string {
  const clean = DOMPurify.sanitize(html, SANITIZE_CONFIG);
  // Ensure any remaining <a> tags open safely; block remote images at CSP.
  return String(clean).replace(
    /<a\s/gi,
    '<a target="_blank" rel="noopener noreferrer" ',
  );
}

export function MessageView({ accountId, messageId }: Props) {
  const { data: message, isLoading, error } = useMessage(accountId, messageId);
  const markRead = useMarkRead(accountId);

  const sanitizedHtml = useMemo(
    () => (message?.bodyHtml ? sanitize(message.bodyHtml) : null),
    [message?.bodyHtml],
  );

  useEffect(() => {
    if (!message || message.isRead || !accountId || !messageId) return;
    markRead.mutate({ messageId, isRead: true });
    // markRead.mutate identity is stable; lint rule appeased via deps list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message?.id]);

  if (!accountId || !messageId) {
    return (
      <div className="flex-1 p-6 text-sm text-neutral-500">
        Select a message to read it.
      </div>
    );
  }
  if (isLoading) {
    return <div className="flex-1 p-6 text-sm text-neutral-500">Loading…</div>;
  }
  if (error || !message) {
    return (
      <div className="flex-1 p-6 text-sm text-red-500">
        {error instanceof Error ? error.message : 'Could not load message.'}
      </div>
    );
  }

  return (
    <article className="flex-1 overflow-y-auto">
      <header className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="text-xl font-semibold">{message.subject || '(no subject)'}</h2>
        <dl className="mt-2 text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-neutral-600 dark:text-neutral-400">
          <dt className="text-neutral-500">From</dt>
          <dd>
            {message.from.name
              ? `${message.from.name} <${message.from.address}>`
              : message.from.address}
          </dd>
          {message.to.length > 0 && (
            <>
              <dt className="text-neutral-500">To</dt>
              <dd className="truncate">
                {message.to.map((a) => a.name || a.address).join(', ')}
              </dd>
            </>
          )}
          <dt className="text-neutral-500">Date</dt>
          <dd>{new Date(message.receivedAt).toLocaleString()}</dd>
        </dl>
      </header>

      <div className="px-6 py-4">
        {sanitizedHtml ? (
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm">
            {message.bodyText ?? '(no body)'}
          </pre>
        )}
      </div>
    </article>
  );
}
