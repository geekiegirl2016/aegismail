# OAuth setup — one-time, per-provider

AegisMail connects to Gmail and Outlook via **OAuth 2.0 with PKCE** (Google / Microsoft both disabled basic auth years ago). This document walks through the one-time registration you do at each provider's console so AegisMail can request the tokens it needs.

You only do this once. After the client IDs are committed to the repo, every AegisMail user benefits — they just see "Sign in with Google" / "Sign in with Microsoft" and never touch a console.

Client IDs **are not secret** for public (desktop) OAuth apps — they're identifiers, not credentials. It's safe to commit them to a public repository. The PKCE flow is what makes this secure against malicious apps impersonating AegisMail.

---

## Google (Gmail)

1. Go to <https://console.cloud.google.com> and sign in with the Google account that will own the AegisMail project.

2. **Create a project** (top bar → project selector → *New project*):
   - Name: `AegisMail`
   - No organisation / no parent folder unless your Google workspace requires it.

3. **Enable the Gmail API**:
   - Left sidebar → *APIs & Services* → *Library*.
   - Search *Gmail API* → click *Enable*.

4. **Configure the OAuth consent screen**:
   - Left sidebar → *APIs & Services* → *OAuth consent screen*.
   - User Type: **External** (unless you're in a Workspace org, then Internal is fine).
   - App name: `AegisMail`
   - User support email: your address.
   - Developer contact email: your address.
   - App logo: optional for now.
   - App domain, privacy policy, terms of service: can leave blank while in testing.
   - **Scopes** — click *Add or remove scopes* and add:
     - `https://mail.google.com/` (full mail access via IMAP/SMTP XOAUTH2)

     Alternatively, narrower scopes work if you prefer (`gmail.readonly`, `gmail.send`, `gmail.modify`) — but `https://mail.google.com/` is the one IMAP XOAUTH2 accepts.
   - **Test users** — while the app is in *Testing* status, add your own Google address as a test user. Only test users can authenticate until you submit for verification (which isn't required for personal / small-scale use; Google's 100-user cap on "Testing" status is fine).

5. **Create OAuth credentials**:
   - Left sidebar → *APIs & Services* → *Credentials*.
   - *Create Credentials* → *OAuth client ID*.
   - Application type: **Desktop app**.
   - Name: `AegisMail Desktop`.
   - Click *Create*. Copy the **Client ID**. *(Ignore the "client secret" — Google issues one but PKCE public clients don't use it. We'll treat it as unused.)*

6. **Drop the client ID + secret into `.env`**:
   ```
   AEGIS_GOOGLE_OAUTH_CLIENT_ID=1234567890-abc...apps.googleusercontent.com
   AEGIS_GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-...
   ```

   Google issues a "client secret" for desktop apps even though RFC 8252 public clients can't keep secrets. Per Google's [documented position](https://developers.google.com/identity/protocols/oauth2/native-app) it's fine to embed in native apps — PKCE is what actually secures the flow. If you want Option A (ship to all AegisMail users), commit the pair to a non-git-ignored config file and your CI will bake them in.

7. **Redirect URI** is automatic for desktop apps — Google accepts any `http://127.0.0.1:*` loopback URI. AegisMail picks a free port at flow-start and tells Google on the fly.

---

## Microsoft (Outlook / Office 365)

1. Go to <https://entra.microsoft.com> and sign in with the Microsoft account that will own the AegisMail app registration.

2. **App registrations** → *New registration*:
   - Name: `AegisMail`
   - Supported account types: **Personal Microsoft accounts only** for consumer Outlook, or *Accounts in any organizational directory and personal Microsoft accounts* for maximum reach.
   - Redirect URI: platform = **Public client/native (mobile & desktop)**, URI = `http://localhost` (Microsoft accepts any `http://localhost:PORT` loopback).
   - Click *Register*.

3. On the *Overview* page, copy the **Application (client) ID**. This is your client ID.

4. **Authentication** → make sure *Allow public client flows* is toggled **Yes**. Save.

5. **API permissions** → *Add a permission*:
   - Microsoft Graph → *Delegated permissions*.
   - Check:
     - `Mail.ReadWrite`
     - `Mail.Send`
     - `MailboxSettings.Read`
     - `User.Read`
     - `offline_access` (required for refresh tokens)
   - *Add permissions*. If your org requires it, click *Grant admin consent* (not needed for personal accounts).

6. **Drop the client ID into the repo**:
   - Add to `.env`:
     ```
     AEGIS_MS_OAUTH_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
     ```
   - Or commit to `apps/server/src/oauth/microsoft.ts` for distribution.

---

## Verifying the client IDs

Once both are in place, start the server (`pnpm --filter @aegismail/server dev`) and hit:

```sh
curl -s http://127.0.0.1:8787/v1/oauth/providers \
  -H "Authorization: Bearer $(security find-generic-password -s com.aegismail.app -a __server_bearer_token__ -w)"
```

Expected response:

```json
{
  "providers": [
    { "id": "google",    "configured": true },
    { "id": "microsoft", "configured": true }
  ]
}
```

If `configured: false`, the client ID env var isn't being read.

---

## Privacy & data collection

Neither Google nor Microsoft forwards user credentials to AegisMail — the OAuth flow hands us short-lived access tokens scoped only to the permissions we requested. We store the refresh token in the macOS Keychain alongside per-account app-specific passwords. Revoke anytime at:

- Google: <https://myaccount.google.com/permissions>
- Microsoft: <https://account.microsoft.com/privacy/app-access>
