# @aegismail/server

Local-first Fastify HTTP API and MCP server for AegisMail.

- Listens on `127.0.0.1:8787` only (no outside network exposure).
- All endpoints except `GET /health` require `Authorization: Bearer <token>`.
- The bearer token is minted on first boot and stored in the macOS Keychain under service `com.aegismail.app`, account `__server_bearer_token__`.
- Per-account IMAP app-passwords are stored under `com.aegismail.app` / `account.<uuid>`.
- SQLite lives at `~/Library/Application Support/AegisMail/aegismail.db`.

## Run

```sh
pnpm install
pnpm --filter @aegismail/server dev
```

## Fetch the bearer token (macOS)

```sh
export AEGIS_TOKEN=$(security find-generic-password \
  -s com.aegismail.app -a __server_bearer_token__ -w)
```

## Add an iCloud account

1. Generate an **app-specific password** at <https://appleid.apple.com> → **Sign-In and Security → App-Specific Passwords**. (Don't use your main Apple ID password.)
2. `POST /v1/accounts` — the password will be written to your Keychain, not the DB.

```sh
curl -sS -X POST http://127.0.0.1:8787/v1/accounts \
  -H "Authorization: Bearer $AEGIS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "icloud",
    "displayName": "My iCloud",
    "emailAddress": "you@icloud.com",
    "appPassword": "xxxx-xxxx-xxxx-xxxx"
  }'
```

## Read mail

```sh
# List accounts
curl -sS -H "Authorization: Bearer $AEGIS_TOKEN" \
  http://127.0.0.1:8787/v1/accounts

# List mailboxes for an account
curl -sS -H "Authorization: Bearer $AEGIS_TOKEN" \
  http://127.0.0.1:8787/v1/accounts/<ACCOUNT_ID>/mailboxes

# List recent messages in INBOX (url-encode the mailbox id)
MAILBOX_ID=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1], safe=""))' "<ACCOUNT_ID>::INBOX")
curl -sS -H "Authorization: Bearer $AEGIS_TOKEN" \
  "http://127.0.0.1:8787/v1/accounts/<ACCOUNT_ID>/mailboxes/$MAILBOX_ID/messages?limit=10"

# Fetch one message with full body
MSG_ID=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1], safe=""))' "<ACCOUNT_ID>::INBOX::12345")
curl -sS -H "Authorization: Bearer $AEGIS_TOKEN" \
  "http://127.0.0.1:8787/v1/accounts/<ACCOUNT_ID>/messages/$MSG_ID"

# Mark read / unread
curl -sS -X PATCH -H "Authorization: Bearer $AEGIS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isRead": true}' \
  "http://127.0.0.1:8787/v1/accounts/<ACCOUNT_ID>/messages/$MSG_ID"
```

## Delete an account

```sh
curl -sS -X DELETE -H "Authorization: Bearer $AEGIS_TOKEN" \
  http://127.0.0.1:8787/v1/accounts/<ACCOUNT_ID>
```

The Keychain entry for that account's password is removed too.

## MCP (stdio)

Set `AEGIS_MCP_STDIO=1` to start the MCP stdio transport alongside the HTTP server. Full tool wiring lands in a later phase.

## Tests

```sh
pnpm --filter @aegismail/server test
```

## Environment

| Variable | Default | Notes |
|---|---|---|
| `AEGIS_SERVER_HOST` | `127.0.0.1` | Don't change to `0.0.0.0` — the auth model assumes localhost. |
| `AEGIS_SERVER_PORT` | `8787` | |
| `AEGIS_LOG_LEVEL` | `info` | `fatal`/`error`/`warn`/`info`/`debug`/`trace`/`silent` |
| `AEGIS_DATA_DIR` | platform default | Override for tests or sandboxed installs. |
| `AEGIS_INSECURE_MEMORY_KEYSTORE` | unset | **Tests only.** Use an in-memory credential store instead of the Keychain. |
| `AEGIS_MCP_STDIO` | unset | When `=1`, also start MCP stdio transport. |
