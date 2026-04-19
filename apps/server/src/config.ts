import { z } from 'zod';

const schema = z.object({
  AEGIS_SERVER_HOST: z.string().default('127.0.0.1'),
  AEGIS_SERVER_PORT: z.coerce.number().int().positive().default(8787),
  AEGIS_LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  AEGIS_GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  AEGIS_GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid server configuration: ${parsed.error.message}`);
  }
  return parsed.data;
}

export function googleOAuthFromConfig(
  config: Config,
): { clientId: string; clientSecret: string } | null {
  if (!config.AEGIS_GOOGLE_OAUTH_CLIENT_ID || !config.AEGIS_GOOGLE_OAUTH_CLIENT_SECRET) {
    return null;
  }
  return {
    clientId: config.AEGIS_GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: config.AEGIS_GOOGLE_OAUTH_CLIENT_SECRET,
  };
}
