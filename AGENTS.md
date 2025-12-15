# AGENTS.md

Perstack is a package manager and runtime for agent-first development. It enables you to define, test, and share modular AI agents called "Experts".

⚠️ **MCP Skills are RCE.** Always use `--runtime docker`. See [SECURITY.md](./SECURITY.md).

## Workflows

| Goal                    | Document                                                 |
| ----------------------- | -------------------------------------------------------- |
| Implement a feature/fix | [agents/implementation.md](./agents/implementation.md)   |
| Write an issue          | [agents/issue-writing.md](./agents/issue-writing.md)     |
| Run QA                  | [agents/qa.md](./agents/qa.md)                           |
| Review a PR             | [agents/pr-review.md](./agents/pr-review.md)             |
| Create an Expert        | [agents/creating-expert.md](./agents/creating-expert.md) |
| Security audit          | [agents/audit.md](./agents/audit.md)                     |
| CLI & perstack.toml     | [docs/](./docs/) (see references/)                       |

## References

| Topic              | Document                             |
| ------------------ | ------------------------------------ |
| Security model     | [SECURITY.md](./SECURITY.md)         |
| Development guide  | [CONTRIBUTING.md](./CONTRIBUTING.md) |
| User documentation | [docs/](./docs/)                     |

## Project Configuration

This project uses:

- Provider: `anthropic`
- Model: `claude-sonnet-4-5`
- Runtime: `docker` (recommended)
