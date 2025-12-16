# Concept

Perstack is built on a concept called **Expert Stack** — the architecture that enables agent-first development.

> [!NOTE]
> The name "Perstack" combines the Latin word "perītus" (meaning "expert") with "stack". Perstack = Expert Stack.

## Vision

The future of software is agentic. Cursor transformed coding. The same shift is coming to CRM, e-commerce, support — every domain where software helps users achieve goals.

But today, building agentic apps means building monoliths. Context explodes, agents can't collaborate, and only the original author can maintain the system. Frameworks help you build, but nothing helps you reuse.

**Perstack exists to change this.** We're building the toolkit so any developer can compose high-quality agentic experiences from proven, reusable components — without starting from zero.

This requires a different approach to development.

## What is agent-first?

Agent-first means focusing on **what the agent should be**, not on how to build applications or runtimes around it.

- **Definition-focused**: You define the agent's role, knowledge, and capabilities — nothing more
- **Right people define**: The people who know "what it should be" (domain experts) write the definitions
- **Runtime realizes**: The system interprets definitions and makes them work — you don't implement the mechanics

This is the opposite of runtime-first (building orchestration logic) or application-first (embedding agents in app code). Agent-first development separates **what** from **how** — you focus on the essential knowledge, the runtime handles orchestration, state, and safety.

## Expert Stack vs. Agent Frameworks

Perstack isn't an agent framework. It solves a different problem.

Agent frameworks focus on **how to build** agent applications — orchestration, tool calling, memory management. The artifact is an application tied to that framework.

Expert Stack focuses on **how to define, share, and reuse** agent capabilities. The artifact is a portable Expert definition that any system can consume.

|                     | Agent Framework              | Expert Stack                                 |
| ------------------- | ---------------------------- | -------------------------------------------- |
| **Developer's job** | Implement behavior in code   | Define roles declaratively                   |
| **Format**          | Code (Python, TypeScript)    | Plain text (TOML)                            |
| **Execution**       | Your code runs               | Runtime interprets definitions               |
| **Artifact**        | Framework-dependent app      | Portable Expert definition                   |
| **Reuse**           | Copy code or wrap as library | Publish to registry, reference as dependency |

Most agent frameworks optimize for building applications, not for reusing what's built. Expert Stack was designed from the ground up with reusability as a first-class concern.

Expert definitions are plain text with no framework dependency. Any agent framework can consume them through the [Registry API](../references/registry-api.md). The ecosystem is open.

## Key features

In agent-first development, the "system" carries most of the weight — it must interpret definitions and make them work. Expert Stack provides:

- **Experts** — modular micro-agents (the definitions)
- **Runtime** — executes Experts
- **Registry** — shares Experts
- **Sandbox Integration** — safe production execution

- [Experts](./experts.md)
- [Runtime](./runtime.md)
- [Registry](./registry.md)
- [Sandbox Integration](./sandbox-integration.md)

## The three goals

These features work together to achieve three goals. When all three are met, agent-first development becomes practical — efficient, easy to operate, and safe.

### Isolation

Isolation means separating an agent from everything except its role — that's what makes it a true Expert.

- **Model isolation**: the runtime mediates access to LLMs
- **Role isolation**: each Expert focuses on one job
- **Control isolation**: all controls live in tools; Experts only decide how to use them
- **Dependency isolation**: collaboration is resolved by the runtime
- **Context isolation**: context windows are never shared; data flows through runtime/workspace
- **Sandbox support**: designed to align with infra-level isolation

**Why context isolation matters for security:**

Each Expert has different skills with different capabilities. Some skills access secrets (API keys, credentials). Some skills retrieve sensitive data (customer records, internal documents). This means an Expert's context may contain information with attack value.

If contexts were shared between Experts, a malicious or compromised Expert could extract secrets and sensitive data from another Expert's context. Context isolation prevents this by design — each Expert sees only its own instruction and the query it receives. No message history, no parent context, no leaked secrets.

This isn't just about preventing prompt bloat. It's a security boundary.

### Observability

Observability means agent behavior is fully transparent and inspectable.

- **Prompt visibility**: no hidden instructions or context injection
- **Definition visibility**: only `perstack.toml` or registry definitions execute
- **Registry visibility**: write-once per version; text-only, fully auditable
- **Tool visibility**: tools run through MCP; usage is explicit
- **Internal state visibility**: state machines emit visible events
- **Deterministic history**: checkpoints make runs reproducible

This isn't just for debugging. Observability is a [prerequisite for sandbox-first security](./sandbox-integration.md#observability-as-a-prerequisite) — you verify behavior after the fact, not before.

### Reusability

Reusability enables agents to collaborate as components — the path to more capable agentic apps.

An Expert is a modular micro-agent:
- Built for a specific purpose
- Reliable at one thing
- Modular and composable

An agent represents a user. An Expert is a specialist component that helps an application achieve its goals.
