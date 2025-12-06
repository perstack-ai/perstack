# GitHub Issue Bot

Automated GitHub issue responder that reads your codebase to answer questions.

|              |                                              |
| ------------ | -------------------------------------------- |
| **Purpose**  | Answer GitHub issues by reading actual code  |
| **Expert**   | `@perstack/github-issue-bot`                 |
| **Skills**   | `@perstack/base` only                        |
| **Sandbox**  | GitHub Actions                               |
| **Trigger**  | Issue opened / `@perstack-issue-bot` mention |
| **Registry** | Published                                    |

## Quick Start

### 1. Copy Files

Copy these files to your repository:

```
your-repo/
├── .github/
│   └── workflows/
│       └── issue-bot.yml        ← from this directory
└── scripts/
    └── checkpoint-filter.ts     ← from this directory
```

### 2. Add Dependencies

Add to your `package.json`:

```json
{
  "devDependencies": {
    "tsx": "^4.0.0"
  }
}
```

### 3. Update Workflow Path

In `issue-bot.yml`, update the path to match your structure:

```yaml
npx perstack run @perstack/github-issue-bot "..." 2>&1 | npx tsx scripts/checkpoint-filter.ts
```

### 4. Add Secret

Go to **Settings → Secrets and variables → Actions → New repository secret**

Add `ANTHROPIC_API_KEY` with your Anthropic API key.

### 5. Done!

- New issues automatically get a response
- Comment `@perstack-issue-bot <question>` for follow-up questions

---

## How checkpoint-filter.ts Works

`checkpoint-filter.ts` is a working example of processing Perstack's event stream.

### Event Stream

When you run `perstack run`, it outputs JSON events to stdout:

```json
{"type":"callTool","toolCall":{"toolName":"think","args":{"thought":"..."}}}
{"type":"callTool","toolCall":{"toolName":"readTextFile","args":{"path":"..."}}}
{"type":"completeRun","text":"Final answer here"}
```

### Processing Events

The filter reads stdin line by line, parses JSON, and formats human-readable output:

```typescript
function formatEvent(event: Record<string, unknown>): string | null {
  const type = event.type as string
  switch (type) {
    case "callTool": {
      const toolCall = event.toolCall as Record<string, unknown>
      const toolName = toolCall?.toolName as string
      const args = toolCall?.args as Record<string, unknown>
      if (toolName === "think") {
        return `💭 ${args?.thought}`
      }
      if (toolName === "readTextFile") {
        return `📖 Reading: ${args?.path}`
      }
      // ... more tool handlers
    }
    case "completeRun": {
      finalAnswer = event.text as string
      return "✅ Done"
    }
  }
}
```

### Event Types

| Event Type    | Description                   | Example Output          |
| ------------- | ----------------------------- | ----------------------- |
| `callTool`    | Tool invocation               | `📖 Reading: src/app.ts` |
| `completeRun` | Run completed with final text | `✅ Done`                |

### Tool-specific Formatting

| Tool Name           | Icon | Output                      |
| ------------------- | ---- | --------------------------- |
| `think`             | 💭    | Thought content (truncated) |
| `readTextFile`      | 📖    | File path                   |
| `listDirectory`     | 📁    | Directory path              |
| `exec`              | ⚡    | Command + args              |
| `attemptCompletion` | ✨    | "Generating answer..."      |

---

## Trigger Conditions

| Event             | Trigger                            |
| ----------------- | ---------------------------------- |
| New issue created | Automatic                          |
| Comment           | Must contain `@perstack-issue-bot` |

## Customization

Edit the workflow file to change the model:

```yaml
cat <<EOF > perstack.toml
model = "gpt-4o"  # or claude-sonnet-4-5, etc.
[provider]
providerName = "openai"  # or anthropic
EOF
```

For OpenAI, add `OPENAI_API_KEY` secret instead.

## Files

| File                   | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `issue-bot.yml`        | GitHub Actions workflow                  |
| `checkpoint-filter.ts` | Event stream processor (working example) |
| `perstack.toml`        | Expert definition                        |
