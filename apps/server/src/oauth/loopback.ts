import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface LoopbackResult {
  code: string;
  state: string;
}

export interface LoopbackHandle {
  /** Full redirect URI to send to the OAuth authorize endpoint. */
  readonly redirectUri: string;
  /** Resolves on /callback with ?code&state, rejects on error/timeout. */
  readonly result: Promise<LoopbackResult>;
  /** Stop the server early (e.g. on user cancel). */
  close(): void;
}

export interface StartLoopbackOptions {
  /** Opaque state that must match the redirect's `state` param. */
  expectedState: string;
  /** Timeout in ms after which the promise rejects (default 5 min). */
  timeoutMs?: number;
  /** Optional friendly HTML shown in the browser after success. */
  successHtml?: string;
  /** Optional HTML shown on error. */
  errorHtml?: (message: string) => string;
}

const DEFAULT_SUCCESS_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>AegisMail — signed in</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0B0D10;color:#E8EAED;display:grid;place-items:center;height:100vh;margin:0}div{text-align:center;max-width:30ch}h1{font-size:18px;margin-bottom:8px}p{font-size:13px;color:#8B93A0}</style></head>
<body><div><h1>✓ Signed in</h1><p>You can close this tab and return to AegisMail.</p></div></body></html>`;

const DEFAULT_ERROR_HTML = (msg: string): string =>
  `<!doctype html><body style="font-family:sans-serif;padding:32px"><h1>AegisMail — sign-in failed</h1><pre>${msg.replace(
    /</g,
    '&lt;',
  )}</pre></body>`;

/**
 * Start a one-shot loopback HTTP server on 127.0.0.1 with an OS-assigned
 * port, accept an OAuth redirect at /callback, and resolve with the code
 * (after verifying state matches `expectedState`).
 *
 * Both Google and Microsoft desktop public clients accept arbitrary
 * http://127.0.0.1:PORT loopback redirect URIs, so we don't need to
 * pre-register the port anywhere — we pick one at flow-start and hand it
 * to the provider in the authorize request.
 */
export async function createLoopbackServer(
  options: StartLoopbackOptions,
): Promise<LoopbackHandle> {
  const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
  const successHtml = options.successHtml ?? DEFAULT_SUCCESS_HTML;
  const errorHtml = options.errorHtml ?? DEFAULT_ERROR_HTML;

  let resolver!: (value: LoopbackResult) => void;
  let rejecter!: (reason: Error) => void;
  let settled = false;

  const result = new Promise<LoopbackResult>((res, rej) => {
    resolver = res;
    rejecter = rej;
  });

  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (url.pathname !== '/callback') {
        res.statusCode = 404;
        res.end('not found');
        return;
      }

      const error = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (error) {
        const desc = url.searchParams.get('error_description') ?? error;
        respond(res, 400, errorHtml(desc));
        finish(new Error(`OAuth provider error: ${desc}`));
        return;
      }
      if (!code || !state) {
        respond(res, 400, errorHtml('missing code or state'));
        finish(new Error('loopback: missing code or state'));
        return;
      }
      if (state !== options.expectedState) {
        respond(res, 400, errorHtml('state mismatch — possible CSRF'));
        finish(new Error('loopback: state mismatch'));
        return;
      }

      respond(res, 200, successHtml);
      finish({ code, state });
    } catch (err) {
      finish(err instanceof Error ? err : new Error(String(err)));
    }
  });

  const timeout = setTimeout(() => {
    if (settled) return;
    settled = true;
    safeClose();
    rejecter(new Error('OAuth loopback timed out'));
  }, timeoutMs);

  function safeClose(): void {
    try {
      server.close();
    } catch {
      // ignore
    }
  }

  function finish(value: LoopbackResult | Error): void {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    // Allow the HTTP response to flush before tearing down the socket.
    setTimeout(safeClose, 100);
    if (value instanceof Error) rejecter(value);
    else resolver(value);
  }

  const port = await new Promise<number>((res, rej) => {
    server.once('listening', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        res((addr as AddressInfo).port);
      } else {
        rej(new Error('loopback: could not determine address'));
      }
    });
    server.once('error', rej);
    server.listen(0, '127.0.0.1');
  });

  return {
    redirectUri: `http://127.0.0.1:${port}/callback`,
    result,
    close() {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      safeClose();
      rejecter(new Error('OAuth loopback cancelled'));
    },
  };
}

function respond(
  res: import('node:http').ServerResponse,
  status: number,
  html: string,
): void {
  res.statusCode = status;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(html);
}
