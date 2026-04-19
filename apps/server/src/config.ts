import { z } from 'zod';

const schema = z.object({
  AEGIS_SERVER_HOST: z.string().default('127.0.0.1'),
  AEGIS_SERVER_PORT: z.coerce.number().int().positive().default(8787),
  AEGIS_LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid server configuration: ${parsed.error.message}`);
  }
  return parsed.data;
}
