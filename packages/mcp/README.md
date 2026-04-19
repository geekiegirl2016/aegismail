# @aegismail/mcp

Model Context Protocol server for AegisMail. Runs as a short-lived stdio
process that Claude Desktop (or any MCP-capable client) spawns on demand.
It reads the per-install bearer token from the macOS Keychain and proxies
tool calls to the local AegisMail HTTP API on `127.0.0.1:8787`.

## Tools

| Name | Description |
|---|---|
| `mail_list_accounts` | List connected mail accounts. |
| `mail_list_mailboxes` | List mailboxes (folders) for an account. |
| `mail_list_messages` | List recent messages in a mailbox (newest first, paginated). |
| `mail_get_message` | Fetch one full message with plain-text body. |

Bodies are HTML-stripped in tool results — text is what LLMs want.
`mail_get_message` truncates bodies over 16 KB.

## Use it from Claude Desktop

1. Make sure the AegisMail HTTP server is running:
   ```sh
   pnpm --filter @aegismail/server dev
   ```
   (This is what mints the Keychain bearer token on first boot.)

2. Build the MCP binary:
   ```sh
   pnpm --filter @aegismail/mcp build
   ```

3. Add this to your Claude Desktop config
   (`~/Library/Application Support/Claude/claude_desktop_config.json`):

   ```json
   {
     "mcpServers": {
       "aegismail": {
         "command": "node",
         "args": [
           "/absolute/path/to/aegismail/packages/mcp/dist/stdio.js"
         ]
       }
     }
   }
   ```

4. Restart Claude Desktop. You should see the `aegismail` server in the
   MCP tools picker and be able to ask things like *"list my iCloud
   mailboxes"* or *"show me my last 10 emails."*

## Environment

| Variable | Default | Notes |
|---|---|---|
| `AEGIS_SERVER_URL` | `http://127.0.0.1:8787` | Override if you run the server elsewhere. |
| `AEGIS_TOKEN` | _(Keychain)_ | Bypass the Keychain lookup. Useful for CI / testing. |

## Run manually

```sh
pnpm --filter @aegismail/mcp dev
```

stdin expects MCP JSON-RPC framing; easier to test via Claude Desktop
than by hand.
