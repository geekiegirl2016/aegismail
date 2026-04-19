#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import keytar from 'keytar';
import { AegisApiClient } from './client.ts';
import { registerMailTools } from './tools.ts';

const KEYCHAIN_SERVICE = 'com.aegismail.app';
const SERVER_TOKEN_ACCOUNT = '__server_bearer_token__';
const DEFAULT_BASE_URL = 'http://127.0.0.1:8787';

async function loadToken(): Promise<string> {
  const envToken = process.env['AEGIS_TOKEN'];
  if (envToken) return envToken;
  const stored = await keytar.getPassword(KEYCHAIN_SERVICE, SERVER_TOKEN_ACCOUNT);
  if (!stored) {
    throw new Error(
      `AegisMail bearer token not found in the macOS Keychain (service=${KEYCHAIN_SERVICE}). ` +
        `Start the server at least once so it can mint a token, or set AEGIS_TOKEN.`,
    );
  }
  return stored;
}

export async function main(): Promise<void> {
  const baseUrl = process.env['AEGIS_SERVER_URL'] ?? DEFAULT_BASE_URL;
  const token = await loadToken();

  const client = new AegisApiClient({ baseUrl, token });

  // Verify we can reach the server before Claude Desktop starts asking.
  try {
    const res = await fetch(new URL('/health', baseUrl).toString());
    if (!res.ok) throw new Error(`health returned ${res.status}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `AegisMail server not reachable at ${baseUrl}: ${msg}. ` +
        `Start it with \`pnpm --filter @aegismail/server dev\`.`,
    );
  }

  const server = new Server(
    { name: 'aegismail', version: '0.0.0' },
    { capabilities: { tools: {} } },
  );

  registerMailTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  // Anything written to stderr shows up in Claude Desktop's MCP log.
  // eslint-disable-next-line no-console
  console.error('aegismail-mcp fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
