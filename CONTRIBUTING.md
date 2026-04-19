# Contributing to AegisMail

Thanks for your interest in AegisMail! This document describes how to propose changes, run the project locally, and what we expect of contributors.

## Code of Conduct

By participating, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md). Please read it before contributing.

## Ways to contribute

- **Report bugs** using the bug-report issue template.
- **Propose features** using the feature-request issue template. For large changes, open a discussion first so we can align on scope.
- **Submit pull requests** for bugs, docs, or features that have been scoped in an issue.
- **Improve docs** — even typo fixes are welcome.

## Development setup

1. Install Node.js ≥ 20.11, pnpm ≥ 9, and the Rust toolchain (for Tauri).
2. Install platform build deps per the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/).
3. Clone the repo and install dependencies:

   ```sh
   git clone https://github.com/aegismail/aegismail.git
   cd aegismail
   pnpm install
   ```

4. Run checks locally before pushing:

   ```sh
   pnpm typecheck
   pnpm lint
   pnpm test
   ```

## Branching and commits

- Work on a topic branch: `feat/<short-slug>`, `fix/<short-slug>`, `docs/<short-slug>`.
- Write focused commits. We loosely follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`) but do not enforce it mechanically.
- Keep PRs small and reviewable. If you find yourself changing unrelated things, open a separate PR.

## Pull request checklist

- [ ] The PR description explains the *why*, not just the *what*.
- [ ] Tests cover the change (or you explain why they don't).
- [ ] `pnpm typecheck && pnpm lint && pnpm test` all pass locally.
- [ ] User-visible changes are noted in the PR description.
- [ ] New dependencies are justified and compatible with AGPL-3.0.

## Licensing of contributions

By submitting a pull request, you agree that your contribution is licensed under the **AGPL-3.0-or-later** license that covers this project, and that you have the right to license it under those terms. Do not submit code you do not own or do not have permission to relicense.

## Security

Please **do not** file public issues for security vulnerabilities. See [SECURITY.md](./SECURITY.md) for responsible disclosure.
