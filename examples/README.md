# Examples

Examples of Perstack Experts demonstrating capabilities.

## Available Examples

| Example                                 | Description                                               | Registry                     |
| --------------------------------------- | --------------------------------------------------------- | ---------------------------- |
| [bug-finder](./bug-finder/)             | Codebase analyzer for finding potential bugs              | Local only                   |
| [github-issue-bot](./github-issue-bot/) | Automated issue responder with real-time activity logging | `@perstack/github-issue-bot` |
| [gmail-assistant](./gmail-assistant/)   | Email assistant with Gmail search and local knowledge     | Local only                   |

## Quick Start

### Using from Registry

```bash
# Run published Expert directly
npx perstack run @perstack/github-issue-bot "Answer issue #123"
```

### Running Locally

```bash
cd examples/github-issue-bot
perstack run @perstack/github-issue-bot "Answer issue #123"
```

## Example Structure

Each example contains:

```
examples/<name>/
├── perstack.toml      # Expert definition
├── README.md          # Setup and usage guide
└── *.ts               # Supporting scripts (if any)
```

## Publishing Your Own

```bash
cd examples/<name>
export PERSTACK_API_KEY=your-key
perstack publish <expert-name>
```

## Contributing

1. Create directory under `examples/`
2. Add `perstack.toml` with Expert definition
3. Add `README.md` with setup instructions
4. Update this README table
