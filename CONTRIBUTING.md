# Contributing to Perstack

Thank you for your interest in contributing to Perstack.

## ⚠️ Agent-First Development

**We develop with AI agents, not just for them.**

Use an AI coding agent (Cursor, Claude Code, Windsurf, Antigravity, etc.) and point it to the `.agent/` directory:

```
Read .agent/ and implement issue #123
```

The `.agent/` directory contains all rules and workflows for this project. Your agent will:

- Follow our coding style and conventions
- Handle versioning and changesets correctly
- Write proper issues and PRs
- Run validation before committing

**Don't code alone. Let your agent read `.agent/` first.**

---

## Quick Start

```bash
git clone https://github.com/perstack-ai/perstack.git
cd perstack
pnpm install
pnpm build
```

## Making Changes

### Fix a Bug

```bash
git checkout -b fix/your-fix
# ... edit code ...
pnpm changeset          # Select: affected package only, Type: patch
pnpm typecheck && pnpm test && pnpm build
git commit -m "fix: your changes"
git push origin fix/your-fix
```

### Add a Feature

```bash
git checkout -b feat/your-feature
# ... edit code ...
pnpm changeset          # Select: ALL packages, Type: minor
pnpm typecheck && pnpm test && pnpm build
git commit -m "feat: your changes"
git push origin feat/your-feature
```

### Breaking Change

Read the [versioning guide](.agent/rules/versioning.md) first. Core changes ripple through everything.

## Validation Commands

```bash
pnpm typecheck      # Type checking
pnpm test           # Unit tests
pnpm test:e2e       # E2E tests
pnpm build          # Build all packages
pnpm format-and-lint # Lint and format
```

## Detailed Guides

For AI agents and detailed guidelines, see the `.agent/` directory:

| Topic                   | Document                                                     |
| ----------------------- | ------------------------------------------------------------ |
| Versioning & Changesets | [.agent/rules/versioning.md](.agent/rules/versioning.md)     |
| Coding Style            | [.agent/rules/coding-style.md](.agent/rules/coding-style.md) |
| Git, Issues, PRs        | [.agent/rules/github.md](.agent/rules/github.md)             |
| Security                | [SECURITY.md](SECURITY.md)                                   |

## CI/CD Pipeline

| Job               | Description                                 |
| ----------------- | ------------------------------------------- |
| `quality`         | Lint, format, typecheck, knip, version sync |
| `test`            | Unit tests with coverage                    |
| `build`           | Build all packages                          |
| `changeset-check` | Verify changeset exists in PR               |

### Release Process

1. Merge PR with changeset to `main`
2. "Version Packages" PR is automatically created
3. Run `pnpm build && pnpm test:e2e` locally
4. Merge "Version Packages" PR → packages published to npm

## Troubleshooting

### "Version sync check failed"

Your changeset must include all packages that need the same `major.minor` version.

```bash
rm .changeset/your-changeset.md
pnpm changeset  # Select correct packages
```

### "Type error in dependent package"

Changed core types but forgot to update dependent packages.

1. Fix the type errors
2. Include all affected packages in changeset
3. Both must have matching `major.minor`

### "Changeset validation failed"

Breaking change requires major bump for all packages.

```bash
rm .changeset/your-changeset.md
pnpm changeset  # Select: ALL packages, Type: major
```

## Getting Help

- **Questions:** [Open a discussion](https://github.com/perstack-ai/perstack/discussions)
- **Bugs:** [Open an issue](https://github.com/perstack-ai/perstack/issues) with reproduction
- **Features:** [Open an issue](https://github.com/perstack-ai/perstack/issues) with use case

---

Thank you for contributing to Perstack.
