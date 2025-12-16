# The Boundary Model

[Isolation](./concept.md#isolation) is one of Perstack's three core goals. Experts are isolated from everything except their role — model access, context, tools, and dependencies are all mediated by the runtime.

The **boundary model** extends this isolation to the application architecture level: **separate the application from the agent runtime**.

## The model

```
        Human (User)
             │
             ▼
┌─────────────────────────────────────┐
│  Your Application                   │
│  - Receives user input              │
│  - Displays agent output            │
│  - Requires confirmation if needed  │
└──────────────┬──────────────────────┘
               │ boundary
┌──────────────▼──────────────────────┐
│  Sandbox                            │
│  ┌────────────────────────────────┐ │
│  │  Perstack Runtime              │ │
│  │  - Executes Experts            │ │
│  │  - Manages tools               │ │
│  │  - Emits events                │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

The application sits between the human and the agent. This is the **human-in-the-loop** boundary — your app decides what reaches the agent and what comes back to the user. You can require confirmation before sensitive actions, filter results, or pause execution for review.

The agent runs on a runtime inside an isolated sandbox. Risk control happens at two layers:

1. **Runtime layer**: Skill configuration, environment isolation, minimal privilege
2. **Sandbox layer**: Network isolation, filesystem restrictions, resource limits

This creates a clear division of responsibility:

| Role                        | Concerns                                                                 |
| --------------------------- | ------------------------------------------------------------------------ |
| **Application developer**   | Build the human-agent interface, handle events, implement approval flows |
| **Infrastructure / DevOps** | Run sandboxes, configure isolation, manage security controls             |

Application developers focus on user experience and control flows. Infrastructure teams handle the sandbox. Neither needs to do the other's job.

## The boundary in practice

The boundary is enforced by infrastructure — typically Docker containers.

**Application side** (see [Adding AI to Your App](../working-with-perstack/adding-ai-to-your-app.md)):
- Spawn containers with queries
- Read JSON events from stdout
- Make decisions based on events

**Infrastructure side** (see [Going to Production](../working-with-perstack/going-to-production.md)):
- Choose where to run containers (Docker, ECS, Cloud Run, Kubernetes)
- Configure network isolation, resource limits, secrets
- Route events back to the application

## Why this matters

This architecture might look like over-engineering. It's not — it's the minimum viable design for multi-user agent applications.

### Security levels

Agent application security can be visualized as layers. Where you start determines how much work you need to do:

```
Security level

     ↑ Secure
     │
     │  ┌─────────────────────────────────────────────────────────┐
     │  │  Your responsibility                                    │
     │  │  - Container isolation (--network none, --read-only)    │
     │  │  - Network controls (allow LLM API only)                │
     │  │  - Human-in-the-loop (approval flows)                   │
     │  │  - MCP server trust                                     │
     │  │                                                         │
     │  │  ↑ Perstack developers start here                       │
     │  └─────────────────────────────────────────────────────────┘
     │  ┌─────────────────────────────────────────────────────────┐
     │  │  What Perstack protects                                 │
     │  │  - Workspace boundary (path validation)                 │
     │  │  - Skill isolation (requiredEnv, pick/omit)             │
     │  │  - Event-based output (no direct network)               │
     │  │  - Full observability (all events logged)               │
     │  │                                                         │
     │  │  ✓ Automatic when using Perstack                        │
     │  └─────────────────────────────────────────────────────────┘
     │  ┌─────────────────────────────────────────────────────────┐
     │  │  Guaranteed insecure                                    │
     │  │  - Shared process across users                          │
     │  │  - Unrestricted file access                             │
     │  │  - Data access + unrestricted network                   │
     │  │  - Untrusted MCP servers                                │
     │  │                                                         │
     │  │  ↑ Traditional framework developers start here          │
     │  └─────────────────────────────────────────────────────────┘
     │
     ↓ Insecure
```

**Traditional agent frameworks** (LangChain, CrewAI, etc.) run agents inside your application process. You start at "Guaranteed insecure" and must climb every level yourself.

**Perstack** is designed for container-per-execution. You start at "Your responsibility" — the lower levels are handled automatically.

### Scaling benefits

Traditional agent frameworks run agents inside your API server. This creates fundamental conflicts:

**The co-location problem**

| Your API server wants... | Your agent wants...                 |
| ------------------------ | ----------------------------------- |
| Fast response (< 100ms)  | Long execution (seconds to minutes) |
| Low memory footprint     | Large context windows, tool state   |
| High concurrency         | Exclusive CPU during inference      |
| Stateless requests       | Persistent conversation state       |

When they share a process:
- Agent requests block threads for minutes, starving other requests
- Load balancer timeouts (30-60s) kill long-running agents mid-execution
- Memory pressure from multiple agents crashes the whole server
- One agent's infinite loop takes down your API

**The separation problem**

"Just run agents in a separate service" sounds simple. In practice:

- **Event streaming**: How do you stream events back? Build WebSocket/SSE infrastructure?
- **State management**: Where does conversation state live? Redis? Database?
- **Job queue**: Do you need Celery/Bull/SQS? How do you handle retries?
- **Service discovery**: How does your API find agent workers?
- **Cold start**: Serverless agents have 10-30s cold starts. Acceptable?

You end up building distributed systems infrastructure just to run agents.

**Perstack's approach**

The boundary model sidesteps both problems:

- **Container-per-execution**: No co-location conflicts. Each agent gets dedicated resources.
- **Stdout events**: No WebSocket infrastructure. Just read container logs.
- **Checkpoint files**: No external state store. State lives in the workspace.
- **Simple interface**: `docker run` with a query. No service mesh required.

You get the benefits of separation without the infrastructure complexity.

## What's next

- [Adding AI to Your App](../working-with-perstack/adding-ai-to-your-app.md) — Application developer guide
- [Going to Production](../working-with-perstack/going-to-production.md) — Infrastructure / DevOps guide
- [Sandbox Integration](./sandbox-integration.md) — Technical deep dive on sandbox security

