# @aegismail/desktop

Tauri 2 desktop shell for AegisMail, with a React + Vite + Tailwind frontend.

## Develop

```sh
pnpm install
pnpm --filter @aegismail/desktop tauri:dev
```

## Build

```sh
pnpm --filter @aegismail/desktop tauri:build
```

Icons live in `src-tauri/icons/`. Generate them from a source PNG with:

```sh
pnpm --filter @aegismail/desktop tauri icon path/to/source.png
```
