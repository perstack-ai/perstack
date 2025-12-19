# create-expert

Interactive wizard to create Perstack Experts.

## Usage

```bash
# Create a new Expert project
npx create-expert

# Improve an existing Expert
npx create-expert my-expert "Add error handling for edge cases"
```

## What it does

### New Project Setup

1. **Detects available LLMs and runtimes**
   - LLMs: Anthropic, OpenAI, Google (via environment variables)
   - Runtimes: Cursor, Claude Code, Gemini CLI

2. **Configures your environment**
   - Prompts for API keys if needed
   - Creates `.env` file with credentials

3. **Creates project files**
   - `AGENTS.md` - Instructions for AI agents working on this project
   - `perstack.toml` - Expert definitions and runtime config

4. **Runs the Expert creation flow**
   - Asks what kind of Expert you want
   - Uses `perstack run` to create and test the Expert
   - Iterates until the Expert works correctly

### Improvement Mode

When called with an Expert name:

```bash
npx create-expert my-expert "Add web search capability"
```

Skips project setup and goes straight to improvement, using the existing configuration.

## Generated Files

### AGENTS.md

Contains:
- Perstack overview
- CLI reference
- perstack.toml format
- Best practices for creating Experts
- MCP Registry usage for finding skills

### perstack.toml

Initial config with the `create-expert` Expert that:
- Understands Expert design principles
- Creates and tests Experts
- Iterates on improvements

## Requirements

- Node.js >= 22.0.0
- One of:
  - LLM API key (Anthropic, OpenAI, or Google)
  - External runtime (Cursor, Claude Code, or Gemini CLI)
