import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Returns the per-user data directory for AegisMail, following platform
 * conventions. Creates it if absent.
 */
export function dataDir(): string {
  const envOverride = process.env['AEGIS_DATA_DIR'];
  if (envOverride) {
    fs.mkdirSync(envOverride, { recursive: true });
    return envOverride;
  }

  const home = os.homedir();
  const dir =
    process.platform === 'darwin'
      ? path.join(home, 'Library', 'Application Support', 'AegisMail')
      : process.platform === 'win32'
        ? path.join(process.env['APPDATA'] ?? path.join(home, 'AppData', 'Roaming'), 'AegisMail')
        : path.join(process.env['XDG_DATA_HOME'] ?? path.join(home, '.local', 'share'), 'aegismail');

  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function defaultDbPath(): string {
  return path.join(dataDir(), 'aegismail.db');
}
