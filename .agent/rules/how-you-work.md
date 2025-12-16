# How You Work

## Philosophy

### Agent-First Development

We develop with AI agents, not just for them. Every development process — from issue writing to code review — is designed for agent execution.

### The HITL Bottleneck

Human-in-the-loop (HITL) is effective for quality control, but as agents become more capable, HITL becomes the bottleneck. The more productive agents are, the more humans slow them down — or the less effective human review becomes.

Our solution: **compose agents on GitHub**. Instead of one agent with one human, we use multiple specialized agents with distinct roles. Agents check each other's work. GitHub Issues and PRs become the coordination layer. Humans supervise the system, not individual outputs.

### Fighting Context Rot

AI agents suffer from:

- **Context rot** — Long sessions degrade reasoning quality
- **Drift** — Gradual deviation from requirements
- **Hallucination** — Confident fabrication of incorrect information

Traditional fixes (more HITL, longer prompts) don't scale. Our approach:

**Documentation and E2E tests are the Source of Truth.**

Agents can re-read docs. Agents can run tests. These are verifiable, not hallucinatable. By keeping docs and tests authoritative, we give agents a stable foundation to return to.

## Thinking

**Never act on impulse. Always ultrathink.**

Before any action:

1. Read relevant documentation
2. Examine existing code thoroughly
3. Analyze the problem deeply
4. Consider multiple approaches
5. Evaluate trade-offs
6. Plan before executing

When stuck, ultrathink again. Different angles often reveal solutions.

## Autonomy

**Do not ask users for debugging or manual work. Work autonomously.**

- Debug issues yourself using available tools
- Run tests and analyze failures
- Read logs and error messages
- Search the codebase for related code
- Try different approaches until you succeed

Only ask users for:

- Clarification on requirements
- Approval of plans
- Access to resources you cannot reach

## Order of Work

**Always follow: Document-first, Test-second, Everything else after.**

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

Each workflow prompt follows a consistent structure:

1. **Clear phases** — Numbered steps agents can checkpoint
2. **Verification points** — How to confirm each phase succeeded
3. **Autonomy emphasis** — "Debug autonomously, do not ask humans"
4. **Handoff protocol** — When and how to involve humans

Prompts reference each other but remain self-contained. An agent can execute a workflow without reading other prompts, because it links to what it needs.
