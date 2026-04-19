# @aegismail/server

Fastify HTTP API plus an MCP server for AegisMail. The HTTP API is consumed by the desktop shell; the MCP server exposes mail operations as tools to MCP-capable clients (e.g. Claude).

## Develop

```sh
pnpm install
pnpm --filter @aegismail/server dev
```

Health check: `GET http://127.0.0.1:8787/health`.

## MCP (stdio)

Set `AEGIS_MCP_STDIO=1` to additionally start the MCP stdio transport alongside the HTTP server.
