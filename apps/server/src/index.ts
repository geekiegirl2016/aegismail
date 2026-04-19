import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { startMcpServer } from './mcp.ts';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp(config);

  await app.listen({ host: config.AEGIS_SERVER_HOST, port: config.AEGIS_SERVER_PORT });

  if (process.env['AEGIS_MCP_STDIO'] === '1') {
    await startMcpServer();
  }
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Fatal:', err);
  process.exit(1);
});
