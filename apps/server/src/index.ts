import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { openDb } from './db/index.ts';
import { createCredentialStore } from './keychain.ts';
import { startMcpServer } from './mcp.ts';

async function main(): Promise<void> {
  const config = loadConfig();
  const db = openDb();
  const credentials = createCredentialStore();

  const { app, registry, bearerToken } = await buildApp({ config, db, credentials });

  await app.listen({ host: config.AEGIS_SERVER_HOST, port: config.AEGIS_SERVER_PORT });
  app.log.info(
    {
      host: config.AEGIS_SERVER_HOST,
      port: config.AEGIS_SERVER_PORT,
      tokenHint: `${bearerToken.slice(0, 6)}…`,
    },
    'aegismail server ready',
  );

  if (process.env['AEGIS_MCP_STDIO'] === '1') {
    await startMcpServer();
  }

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'shutting down');
    try {
      await registry.closeAll();
      await app.close();
      db.close();
    } finally {
      process.exit(0);
    }
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Fatal:', err);
  process.exit(1);
});
