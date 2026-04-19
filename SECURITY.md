# Security Policy

## Supported versions

AegisMail is pre-alpha. Only the `main` branch is supported while the 0.x series is under active development.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, email **security@aegismail.org** with:

- A description of the issue and its impact
- Reproduction steps or a proof of concept
- The affected component (e.g. `apps/server`, a specific provider)
- Your name and affiliation, if you'd like to be credited

You can expect:

- An acknowledgement within **3 business days**.
- A triage update within **10 business days**, including severity and a target timeline.
- Coordinated disclosure: we will work with you on a fix and agree on a disclosure date before anything public.

## Scope

In scope:

- Code in this repository (desktop app, server, provider adapters, MCP tools).
- Default configurations shipped with AegisMail.

Out of scope:

- Vulnerabilities in upstream services (Microsoft Graph, Gmail API, JMAP servers, etc.) — please report those to the respective vendors.
- Issues requiring physical access to an unlocked device.
- Social-engineering attacks against contributors or users.

## Safe harbor

We will not pursue legal action against researchers who make a good-faith effort to follow this policy, who avoid privacy violations and service disruption, and who give us reasonable time to respond before disclosure.
