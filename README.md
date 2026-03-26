# notion-agent

Agent-native CLI + MCP server for the Notion API. Every Notion endpoint is a CLI command and an MCP tool — one integration, two interfaces, zero duplication.

Built for AI agents (OpenClaw, Claude, Cursor) and automation scripts that need to read, write, and query Notion workspaces.

---

## Install

```bash
npm install -g notion-agent
```

Or run without installing:

```bash
npx notion-agent databases list
```

---

## Authentication

You need a Notion integration token. Create one at [notion.so/my-integrations](https://www.notion.so/my-integrations).

**Option 1 — Environment variable (recommended for CI/agents):**
```bash
export NOTION_TOKEN=secret_xxxxxxxxxxxx
```

**Option 2 — Login command (saves to `~/.notion-cli/config.json`):**
```bash
notion login --token secret_xxxxxxxxxxxx
```

**Option 3 — Per-command flag:**
```bash
notion --token secret_xxxxxxxxxxxx databases list
```

> **Important:** Your integration only sees pages and databases that have been explicitly shared with it. In Notion, open a page/database → Share → Invite your integration.

---

## Quick Start

```bash
# Verify auth + show workspace
notion workspace info

# List accessible databases
notion databases list --pretty

# Search pages by title
notion search pages --query "Project Brief"

# Query a database with filter
notion databases query \
  --database-id abc123 \
  --filter '{"property":"Status","select":{"equals":"In Progress"}}' \
  --flat --pretty

# Get a page as Markdown (great for agents)
notion pages markdown --page-id abc123

# Append a block to a page
notion blocks append --block-id <page-id> --type heading_1 --text "Meeting Notes"
notion blocks append --block-id <page-id> --type to_do --text "Follow up with client" --checked false

# Create a page in a database
notion pages create \
  --parent-database-id abc123 \
  --title "New Task" \
  --pretty
```

---

## Global Flags

These work on every command:

| Flag | Description |
|---|---|
| `--token <token>` | Override `NOTION_TOKEN` env var |
| `--pretty` | Pretty-print JSON output |
| `--quiet` | Suppress output (exit code only) |
| `--fields <a,b,c>` | Return only specified top-level fields |
| `--flat` | Flatten page property values to readable scalars |

### `--flat` flag

Notion returns properties as deeply nested objects. `--flat` converts them to human-readable scalars:

```bash
# Without --flat: {"Name": {"type":"title","title":[{"plain_text":"My Task",...}]}}
# With --flat:    {"Name": "My Task"}
notion databases query --database-id abc123 --flat --pretty
```

---

## Commands

### `databases`

| Subcommand | Description |
|---|---|
| `list` | List all accessible databases |
| `get` | Get database metadata and property schema |
| `schema` | Human-readable schema — property names, types, and options |
| `properties` | Flat list of property names and types |
| `query` | Query database rows with filters and sorts |
| `create` | Create a new database under a parent page |
| `update` | Update title, description, or archive a database |

```bash
notion databases query --database-id <id> \
  --filter '{"property":"Status","select":{"equals":"Done"}}' \
  --sorts '[{"property":"Created","direction":"descending"}]' \
  --page-size 50 --flat --pretty
```

### `pages`

| Subcommand | Description |
|---|---|
| `get` | Retrieve a page and its properties |
| `create` | Create a page (child page or database row) |
| `update` | Update page properties |
| `archive` | Move page to trash |
| `restore` | Restore page from trash |
| `property` | Get a single property (use for >25 references) |
| `content` | Get page content as blocks |
| `markdown` | Get page content as Markdown text |

```bash
# Get page as Markdown — best for agents reading content
notion pages markdown --page-id <id>
```

### `blocks`

| Subcommand | Description |
|---|---|
| `get` | Retrieve a single block |
| `children` | List block children (one level deep) |
| `append` | Append blocks to a page or block |
| `update` | Update block content |
| `delete` | Delete a block (reversible from Notion) |

```bash
# Append different block types
notion blocks append --block-id <id> --type paragraph --text "Some text"
notion blocks append --block-id <id> --type code --text "console.log('hi')" --language typescript
notion blocks append --block-id <id> --type divider
notion blocks append --block-id <id> --blocks '[{"object":"block","type":"paragraph","paragraph":{"rich_text":[{"type":"text","text":{"content":"Hello"}}]}}]'
```

### `users`

| Subcommand | Description |
|---|---|
| `list` | List all workspace members |
| `get` | Get a specific user by ID |
| `me` | Get the bot user for this integration |

### `comments`

| Subcommand | Description |
|---|---|
| `list` | List comments on a page or block |
| `create` | Add a comment to a page or discussion thread |

### `search`

| Subcommand | Description |
|---|---|
| `all` | Search pages and databases by title |
| `pages` | Search pages only |
| `databases` | Search databases only |

> Note: Notion search matches on **titles only**, not page body content.

### `workspace`

| Subcommand | Description |
|---|---|
| `info` | Verify auth + show workspace name and bot identity |

---

## Output

All output is JSON on stdout. Errors go to stderr. Exit code `0` = success, `1` = error.

```bash
# Machine-readable (default)
notion databases list

# Human-readable
notion databases list --pretty

# Pipe to jq
notion databases query --database-id abc123 --flat | jq '.results[] | .properties.Name'
```

---

## MCP Server

Use as an MCP server with Claude Code, Claude Desktop, Cursor, or any MCP client.

### Claude Code

```bash
claude mcp add notion -- node /path/to/notion-mcp
# Or if installed globally:
claude mcp add notion -- notion-mcp
```

Set `NOTION_TOKEN` in your environment before starting Claude Code.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "notion": {
      "command": "notion-mcp",
      "env": {
        "NOTION_TOKEN": "secret_xxxxxxxxxxxx"
      }
    }
  }
}
```

### Available MCP Tools

All 29 commands are available as MCP tools with the naming convention `<group>_<subcommand>`:

`databases_list`, `databases_get`, `databases_schema`, `databases_properties`, `databases_query`, `databases_create`, `databases_update`, `pages_get`, `pages_create`, `pages_update`, `pages_archive`, `pages_restore`, `pages_property`, `pages_content`, `pages_markdown`, `blocks_get`, `blocks_children`, `blocks_append`, `blocks_update`, `blocks_delete`, `users_list`, `users_get`, `users_me`, `comments_list`, `comments_create`, `search_all`, `search_pages`, `search_databases`, `workspace_info`

---

## Rate Limits

Notion enforces **3 requests/second** average per integration. The tool respects this by catching `429` errors — if you hit rate limits, add delays between bulk operations.

---

## License

MIT — [github.com/bcharleson/notion-agent](https://github.com/bcharleson/notion-agent)
