import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { loadEnvFiles } from './env.ts';
import { openDb } from './db/index.ts';
import { createCredentialStore } from './keychain.ts';
import { createTokenStore } from './oauth/token-store.ts';

async function main(): Promise<void> {
  const envFiles = loadEnvFiles();
  const config = loadConfig();
  const db = openDb();
  const credentials = createCredentialStore();
  const tokens = createTokenStore();

  const { app, registry, bearerToken } = await buildApp({
    config,
    db,
    credentials,
    tokens,
  });

  await app.listen({ host: config.AEGIS_SERVER_HOST, port: config.AEGIS_SERVER_PORT });
  app.log.info(
    {
      host: config.AEGIS_SERVER_HOST,
      port: config.AEGIS_SERVER_PORT,
      tokenHint: `${bearerToken.slice(0, 6)}…`,
      googleOAuth: !!config.AEGIS_GOOGLE_OAUTH_CLIENT_ID,
      envFiles,
    },
    'aegismail server ready',
  );

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
