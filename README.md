# AegisMail

> Unified, privacy-respecting mail client for Outlook, Gmail, and iCloud/Apple Mail.

AegisMail brings your mail accounts under one roof without giving up control of your data. It ships as a native desktop app (via Tauri 2) backed by a local TypeScript server, and exposes mail operations over the [Model Context Protocol (MCP)](https://modelcontextprotocol.io) so AI assistants can help you triage, search, and draft mail on your terms.

**Status:** pre-alpha scaffolding. Interfaces will change.

## Features (planned)

- First-class support for **Microsoft Graph** (Outlook), **Gmail API**, and **JMAP** (iCloud / Fastmail).
- A single unified inbox, threading model, and search across accounts.
- Local-first storage; no AegisMail-operated cloud.
- MCP server so Claude and other MCP-capable assistants can read, search, draft, and send mail.
- Cross-platform desktop app (macOS, Windows, Linux) built on Tauri 2.

## Architecture

```
aegismail/
├── apps/
│   ├── desktop/            Tauri 2 shell + React/Vite/Tailwind UI
│   └── server/             Fastify HTTP API + MCP server
└── packages/
    ├── core/               Shared domain types, zod schemas, error taxonomy
    ├── providers/          Adapters: Microsoft Graph, Gmail, JMAP
    ├── mcp/                MCP tool definitions
    └── ui/                 Shared React components
```

Managed as a pnpm workspace with Turborepo.

## Getting started

### Prerequisites

- Node.js **≥ 20.11** and pnpm **≥ 9**
- Rust stable toolchain (for Tauri) — `brew install rust` or [rustup](https://rustup.rs)
- Platform build deps for Tauri 2 — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)

### Develop

```sh
pnpm install

# Backend (must be running for the desktop app to work)
pnpm --filter @aegismail/server dev

# Desktop app in dev mode (hot-reload)
pnpm --filter @aegismail/desktop tauri:dev
```

### Build a native macOS app

```sh
pnpm --filter @aegismail/desktop tauri:build
```

Artifacts land in `apps/desktop/src-tauri/target/release/bundle/`:
- `macos/AegisMail.app` — drag into `/Applications`
- `dmg/AegisMail_*_aarch64.dmg` — share-friendly installer

Because the build is **unsigned**, macOS Gatekeeper will refuse to open the `.app` on first launch. Workarounds:

- Right-click the `.app` → **Open** → confirm in the dialog, or
- Strip the quarantine attribute: `xattr -d com.apple.quarantine /Applications/AegisMail.app`

Signed + notarized builds require an Apple Developer ID and are a future milestone.

### Claude Desktop (MCP)

See [`packages/mcp/README.md`](./packages/mcp/README.md) for the config snippet that lets Claude Desktop spawn the AegisMail MCP server.

## Contributing

We welcome contributors — see [CONTRIBUTING.md](./CONTRIBUTING.md) and our [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md). Security issues: please follow [SECURITY.md](./SECURITY.md) rather than filing a public issue.

## License

AegisMail is licensed under the **GNU Affero General Public License v3.0 or later** (AGPL-3.0-or-later). See [LICENSE](./LICENSE) for the full text.

In short: you may use, modify, and distribute AegisMail freely, but if you run a modified version as a network service, you must make your modified source available to its users.
