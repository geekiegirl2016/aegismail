import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

/**
 * Load environment variables from `.env` files found near the repo root,
 * so `pnpm --filter @aegismail/server dev` works without a manual
 * `source .env`. Looks in this order, first match wins:
 *
 *   1. $AEGIS_ENV_FILE if set (explicit override)
 *   2. <repo-root>/.env    (monorepo-level, what .env.example documents)
 *   3. <cwd>/.env          (if someone `cd`ed into apps/server first)
 *
 * Called once from index.ts before loadConfig(). No-ops in the packaged
 * sidecar build — that ships a standalone ncc bundle under
 * /Applications/AegisMail.app/.../resources/server/ where no repo
 * `.env` exists; env vars come from the Rust spawn in that case.
 */
export function loadEnvFiles(): string[] {
  const loaded: string[] = [];

  const explicit = process.env['AEGIS_ENV_FILE'];
  if (explicit && existsSync(explicit)) {
    loadDotenv({ path: explicit });
    loaded.push(explicit);
    return loaded;
  }

  const here = dirname(fileURLToPath(import.meta.url));
  // apps/server/src → apps/server → apps → repo-root.
  const repoRoot = resolve(here, '..', '..', '..', '..');
  const candidates = [resolve(repoRoot, '.env'), resolve(process.cwd(), '.env')];

  for (const path of candidates) {
    if (existsSync(path)) {
      loadDotenv({ path });
      loaded.push(path);
    }
  }
  return loaded;
}
