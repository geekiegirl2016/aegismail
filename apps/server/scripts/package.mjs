#!/usr/bin/env node
/**
 * Produce a self-contained AegisMail server deployment for Tauri to ship
 * as an .app resource.
 *
 * Pipeline:
 *   1. tsc -b     — compile TypeScript to dist/
 *   2. ncc        — bundle dist/index.js + all deps (incl. native .node
 *                   files) into a flat dist-deploy/dist/
 *   3. node-dist  — download & cache the official Node.js binary (static,
 *                   no libnode.dylib rpath issue) to dist-deploy/node
 *   4. sanity     — boot the packaged server and hit /health
 */
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  rmSync,
  copyFileSync,
  chmodSync,
  statSync,
} from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';

const NODE_VERSION = 'v22.12.0';
const NODE_TARGET = 'darwin-arm64';

const here = dirname(fileURLToPath(import.meta.url));
const serverRoot = resolve(here, '..');
const deployDir = resolve(serverRoot, 'dist-deploy');
const cacheDir = resolve(tmpdir(), 'aegismail-node-cache');

function run(cmd, args, options = {}) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { stdio: 'inherit', ...options });
}

async function ensureNodeBinary() {
  mkdirSync(cacheDir, { recursive: true });
  const tarName = `node-${NODE_VERSION}-${NODE_TARGET}.tar.xz`;
  const tarPath = resolve(cacheDir, tarName);
  const extractedDir = resolve(cacheDir, `node-${NODE_VERSION}-${NODE_TARGET}`);
  const binPath = resolve(extractedDir, 'bin', 'node');

  if (existsSync(binPath)) {
    console.log(`using cached Node ${NODE_VERSION} at ${binPath}`);
    return binPath;
  }

  if (!existsSync(tarPath)) {
    const url = `https://nodejs.org/dist/${NODE_VERSION}/${tarName}`;
    console.log(`downloading ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`node dist HTTP ${res.status}`);
    const sink = createWriteStream(tarPath);
    await pipeline(res.body, sink);
  }

  console.log(`extracting ${tarName}`);
  run('tar', ['-xJf', tarPath, '-C', cacheDir]);
  if (!existsSync(binPath)) throw new Error(`extracted node missing at ${binPath}`);
  return binPath;
}

// 1. Clean slate
rmSync(deployDir, { recursive: true, force: true });
mkdirSync(deployDir, { recursive: true });

// 2. Compile TS
run('pnpm', ['--dir', serverRoot, 'build']);

// 3. Bundle with ncc
run('pnpm', [
  '--dir',
  serverRoot,
  'exec',
  'ncc',
  'build',
  'dist/index.js',
  '-o',
  `${deployDir}/dist`,
  '--target',
  'es2022',
  '--source-map',
]);

// 4. Stage a portable Node
const nodeSrc = await ensureNodeBinary();
const nodeDst = resolve(deployDir, 'node');
copyFileSync(nodeSrc, nodeDst);
chmodSync(nodeDst, 0o755);
const nodeSize = (statSync(nodeDst).size / (1024 * 1024)).toFixed(1);

console.log(`\ndeploy ready at ${deployDir}`);
console.log(`  node:  ${nodeDst} (${nodeSize} MB)`);
console.log(`  entry: ${resolve(deployDir, 'dist/index.js')}`);

// 5. Sanity boot
const proc = spawn(nodeDst, [resolve(deployDir, 'dist/index.js')], {
  cwd: deployDir,
  env: {
    ...process.env,
    AEGIS_DATA_DIR: `${deployDir}/.sanity-data`,
    AEGIS_SERVER_PORT: '8797',
    AEGIS_LOG_LEVEL: 'silent',
    AEGIS_INSECURE_MEMORY_KEYSTORE: '1',
  },
  stdio: ['ignore', 'pipe', 'inherit'],
});
proc.stdout.on('data', () => {});

await new Promise((r) => setTimeout(r, 2000));
const ok = await fetch('http://127.0.0.1:8797/health')
  .then((r) => r.ok)
  .catch(() => false);
proc.kill('SIGTERM');
await new Promise((r) => setTimeout(r, 200));
proc.kill('SIGKILL');

if (!ok) {
  console.error('sanity check: server did not respond on /health');
  process.exit(1);
}
console.log('sanity: packaged server responded on /health');
