# Agent Prompts

Practical prompts for AI agents to execute Perstack's development process.

## Philosophy

### Agent-First Development

We develop with AI agents, not just for them. Every development process — from issue writing to code review — is designed for agent execution.

### The HITL Bottleneck

Human-in-the-loop (HITL) is effective for quality control, but as agents become more capable, HITL becomes the bottleneck. The more productive agents are, the more humans slow them down — or the less effective human review becomes.

Our solution: **compose agents on GitHub**. Instead of one agent with one human, we use multiple specialized agents with distinct roles:

| Agent Role      | Prompt                                     |
| --------------- | ------------------------------------------ |
| Issue Writing   | [issue-writing.md](./issue-writing.md)     |
| Implementation  | [implementation.md](./implementation.md)   |
| QA              | [qa.md](./qa.md)                           |
| PR Review       | [pr-review.md](./pr-review.md)             |
| Security Audit  | [audit.md](./audit.md)                     |
| Expert Creation | [creating-expert.md](./creating-expert.md) |

Agents check each other's work. GitHub Issues and PRs become the coordination layer. Humans supervise the system, not individual outputs.

### Fighting Context Rot

AI agents suffer from:
- **Context rot** — Long sessions degrade reasoning quality
- **Drift** — Gradual deviation from requirements
- **Hallucination** — Confident fabrication of incorrect information

Traditional fixes (more HITL, longer prompts) don't scale. Our approach:

**Documentation and E2E tests are the Source of Truth.**

Agents can re-read docs. Agents can run tests. These are verifiable, not hallucinatable. By keeping docs and tests authoritative, we give agents a stable foundation to return to.

## Three Principles

### 1. Document-First

Update documentation before writing code.

Why: Documentation is what agents read to understand requirements. If docs are stale, agents hallucinate. Current docs prevent drift.

### 2. Test-First (E2E Primary)

Write E2E tests before implementation. Unit tests are supplementary.

Why: E2E tests verify observable behavior — what users actually experience. They're harder to game and survive refactoring. Unit tests are useful for complex logic but can create false confidence.

### 3. Agent-First

Design processes for agent execution, not human convenience.

Why: Agents will execute these processes thousands of times. Optimize for their strengths (consistency, speed, parallelism) and weaknesses (context limits, drift, hallucination).

## Prompt Design

Each prompt follows a consistent structure:

1. **Clear phases** — Numbered steps agents can checkpoint
2. **Verification points** — How to confirm each phase succeeded
3. **Autonomy emphasis** — "Debug autonomously, do not ask humans"
4. **Handoff protocol** — When and how to involve humans

Prompts reference each other but remain self-contained. An agent can execute `implementation.md` without reading other prompts, because it links to what it needs.

## The GitHub Composition Model

```
┌─────────────────────────────────────────────────────────────┐
│                         GitHub                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Human requests issue ◄──── Entry point                    │
│         │                                                   │
│         ▼                                                   │
│   Issue Writer Agent                                        │
│         │                                                   │
│         ▼                                                   │
│   ┌─────────────┐                                           │
│   │   Issue     │                                           │
│   └─────────────┘                                           │
│         │                                                   │
│         ▼                                                   │
│   Implementation Agent                                      │
│         │                                                   │
│         ▼                                                   │
│   ┌─────────────┐                                           │
│   │     PR      │ ◄──── Bugbot reviews code                 │
│   └─────────────┘       QA Agent verifies tests             │
│         │               PR Review Agent checks standards    │
│         ▼                                                   │
│   Human approves merge ◄──── Exit point                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Agents operate asynchronously. GitHub is the shared state. Humans intervene at defined checkpoints, not continuously.

## Usage

Point your AI agent to the relevant prompt:

```
Read agents/implementation.md and implement issue #123
```

The prompt will guide the agent through the complete workflow.
