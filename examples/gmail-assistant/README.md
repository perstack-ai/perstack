# Gmail Assistant

AI-powered email assistant that searches Gmail, explores context, and composes optimal replies.

|              |                                                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**  | Reply to emails with context from inbox and local knowledge                                                                |
| **Expert**   | `email-assistant`                                                                                                          |
| **Skills**   | [@gongrzhe/server-gmail-autoauth-mcp](https://www.npmjs.com/package/@gongrzhe/server-gmail-autoauth-mcp), `@perstack/base` |
| **Sandbox**  | Local execution                                                                                                            |
| **Trigger**  | User query like "Reply to John's email about the project"                                                                  |
| **Registry** | Not published (requires Gmail OAuth setup)                                                                                 |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  email-assistant (Coordinator)                                  │
│  ├── Receives user query: "Reply to John's email"               │
│  ├── Delegates to inbox-searcher to find the email              │
│  ├── Delegates to knowledge-finder to gather context            │
│  └── Delegates to email-composer to write the reply             │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌────────────────┐    ┌───────────────┐
│ inbox-searcher│    │ knowledge-finder│    │ email-composer│
│               │    │                │    │               │
│ Gmail MCP     │    │ @perstack/base │    │ Gmail MCP +   │
│ (search/read) │    │ (file ops)     │    │ @perstack/base│
└───────────────┘    └────────────────┘    └───────────────┘
```

## Quick Start

### Option A: Guided Setup (Recommended)

Use the setup assistant to guide you through each step:

```bash
cd my-workspace
cp /path/to/examples/gmail-assistant/perstack.toml .
export ANTHROPIC_API_KEY=your-key

npx perstack run setup-assistant "Start setup"
```

The assistant will:
1. Tell you what to do in Google Cloud Console
2. Wait for you to complete it

After completing the Google Cloud setup, run:
```bash
npx perstack run setup-assistant "Done"
```

The assistant will guide you through authentication. Repeat until complete.

---

### Option B: Manual Setup

#### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Gmail API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Gmail API" and enable it
4. Configure **OAuth consent screen**:
   - Go to **APIs & Services** → **OAuth consent screen**
   - Select **External** user type
   - Fill in App name, User support email, Developer contact
   - Add your email as a **test user**
5. Create **OAuth credentials**:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Select **Desktop app**
   - Download the JSON file
6. Place credentials:
   ```bash
   mkdir -p ~/.gmail-mcp
   mv ~/Downloads/client_secret_*.json ~/.gmail-mcp/gcp-oauth.keys.json
   ```

#### 2. Authenticate

```bash
npx -y @gongrzhe/server-gmail-autoauth-mcp auth
```

A browser opens. Sign in with your Google account and authorize access.

#### 3. Run the Assistant

```bash
cd my-workspace
export ANTHROPIC_API_KEY=your-key
npx perstack run email-assistant "Reply to John's email about the Q4 report" 2>&1 | npx tsx filter.ts
```

---

## Example Queries

| Query                                          | What happens                                             |
| ---------------------------------------------- | -------------------------------------------------------- |
| "Reply to John's email about the project"      | Searches for emails from John mentioning "project"       |
| "Answer the latest email from hr@company.com"  | Finds the most recent email from HR                      |
| "Respond to the meeting invite from yesterday" | Searches for recent meeting-related emails               |
| "会計士からのメールに返信したい"               | Searches for emails from accountant (Japanese supported) |

## Output

The assistant creates a **Gmail draft** in the same thread as the original email:

1. Filter shows clickable URL: `🔗 https://mail.google.com/mail/u/0/#inbox/{threadId}`
2. Click to open the draft directly in Gmail
3. Review, edit if needed, and send

A local copy is also saved to `./drafts/` for reference.

---

## Expert Details

### email-assistant

The coordinator Expert that orchestrates the workflow:

1. Parses user query to understand intent
2. Delegates email search to `inbox-searcher`
3. Delegates knowledge gathering to `knowledge-finder`
4. Delegates reply composition to `email-composer`
5. Creates Gmail draft and local file backup

### inbox-searcher

Gmail search specialist:

| Tool            | Purpose                       |
| --------------- | ----------------------------- |
| `search_emails` | Find emails matching criteria |
| `get_email`     | Retrieve full email content   |
| `get_thread`    | Get conversation context      |

Returns **Thread ID** and **Message ID** for proper reply threading.

### knowledge-finder

Local filesystem search for context enrichment.

**Setup:** Place knowledge files in your workspace directory:

```
my-workspace/
├── perstack.toml
├── context/            # Conversation history (auto-populated)
│   └── john_proposal.md
│   └── accountant_tax.md
├── notes/              # Meeting notes, project info
│   └── project-x.md
├── docs/               # Company docs, policies
│   └── company-info.md
├── contracts/          # PDFs, agreements
│   └── engagement.pdf
└── contacts/           # Contact info, org charts
    └── vendors.txt
```

The `context/` directory is special — it stores conversation history automatically.
The assistant searches these files to add relevant context to your replies.

| Tool            | Purpose                          |
| --------------- | -------------------------------- |
| `listDirectory` | Explore workspace structure      |
| `readTextFile`  | Read text, markdown, PDF content |
| `getFileInfo`   | Get file metadata                |

### email-composer

Reply composition, Gmail draft creation, and context management:

| Tool              | Purpose                           |
| ----------------- | --------------------------------- |
| `draft_email`     | Create Gmail draft in thread      |
| `writeTextFile`   | Save local backup                 |
| `editTextFile`    | Append to context files           |
| `createDirectory` | Create drafts/context directories |

**Context Management:** After composing a reply, the assistant appends a summary to `context/{person}_{topic}.md`. This builds up conversation history over time, so future replies have full context.

---

## Security Notes

- OAuth credentials stored in `~/.gmail-mcp/`
- Never commit credentials to version control
- **Drafts only** - emails are not sent automatically
- Review drafts in Gmail before sending

## Troubleshooting

### OAuth Keys Not Found

```
Error: OAuth keys not found
```

Ensure `gcp-oauth.keys.json` exists in `~/.gmail-mcp/`.

### Authentication Failed

```
Error: Token refresh failed
```

Re-authenticate:

```bash
rm ~/.gmail-mcp/credentials.json
npx -y @gongrzhe/server-gmail-autoauth-mcp auth
```

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

Stop the process using port 3000 (often Docker/dev servers), then retry.

### No Emails Found

- Check search query syntax
- Verify Gmail API is enabled
- Ensure your email is added as test user in OAuth consent screen

---

## Files

| File            | Purpose                             |
| --------------- | ----------------------------------- |
| `perstack.toml` | Expert definitions                  |
| `filter.ts`     | Output filter for readable progress |
| `README.md`     | This documentation                  |

## Output Filter

The `filter.ts` script shows real-time agent activity:

```
[inbox-searcher] 📧 Searching: from:john@example.com
[inbox-searcher] 📨 Reading email...
[knowledge-finder] 📁 Listing: docs/
[email-composer] 📝 Creating Gmail draft to john@example.com (thread: abc123)
[email-composer] ✅ Draft saved: r1234567890
[email-composer] 🔗 https://mail.google.com/mail/u/0/#inbox/abc123
[email-composer] ✅ Done
```

Click the URL to open the draft directly in Gmail.

To see raw JSON output without filter:

```bash
npx perstack run email-assistant "your query"
```

## References

- [@gongrzhe/server-gmail-autoauth-mcp](https://www.npmjs.com/package/@gongrzhe/server-gmail-autoauth-mcp) - Gmail MCP server
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Perstack Documentation](https://perstack.ai)
