#!/usr/bin/env node
/**
 * Copy the server deployment produced by `pnpm --filter @aegismail/server
 * package` into the Tauri `resources/server/` tree so `tauri build` can
 * embed it in the .app. Runs from the desktop app's tauri:build/dev
 * prebuild hook.
 */
import { cpSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(here, '..');
const repoRoot = resolve(desktopRoot, '..', '..');

const src = resolve(repoRoot, 'apps/server/dist-deploy');
const dst = resolve(desktopRoot, 'src-tauri/resources/server');

if (!existsSync(src)) {
  console.error(
    `server deployment not found at ${src}\n` +
      `Run \`pnpm --filter @aegismail/server package\` first.`,
  );
  process.exit(1);
}

rmSync(dst, { recursive: true, force: true });
cpSync(src, dst, { recursive: true, dereference: false });
console.log(`copied server deployment → ${dst}`);
