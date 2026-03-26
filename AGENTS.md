# AGENTS.md — Notion CLI

Agent discovery guide for `@bcharleson/notion-agent`. This tool wraps the entire Notion API as both a CLI and an MCP server.

---

## Quick Start for Agents

```bash
# Verify auth
notion workspace info

# Discover what's accessible
notion databases list --flat --pretty
notion search all --pretty
```

---

## Authentication

Set `NOTION_TOKEN` in the environment before any command:

```bash
export NOTION_TOKEN=secret_xxxxxxxxxxxx
```

Or pass per-command:
```bash
notion --token secret_xxx databases list
```

**Important:** The integration only sees pages/databases explicitly shared with it. If a database/page returns 404, it hasn't been shared with the integration.

---

## Output Format

All commands output JSON to stdout. Exit code `0` = success, `1` = error.

**Use `--flat` for agent-readable property values:**
```bash
# Raw Notion output (nested, verbose):
{"Name": {"type":"title","title":[{"plain_text":"My Task","annotations":{},...}]}}

# With --flat (readable):
{"Name": "My Task"}
```

**Use `--fields` to reduce response size:**
```bash
notion databases query -d <id> --flat --fields id,properties --pretty
```

**Use `--pretty` for human-readable debugging:**
```bash
notion databases schema -d <id> --pretty
```

---

## Pagination

Use `--start-cursor` with the `next_cursor` from the previous response:

```bash
# First page
notion databases query -d <id> --page-size 10

# Next page (use next_cursor from above response)
notion databases query -d <id> --page-size 10 --start-cursor <next_cursor>
```

Response includes `has_more: true/false` and `next_cursor`.

---

## Command Reference

### databases

| MCP Tool | CLI | Description |
|---|---|---|
| `databases_list` | `notion databases list` | List all accessible databases |
| `databases_get` | `notion databases get -d <id>` | Get database metadata + full schema |
| `databases_schema` | `notion databases schema -d <id>` | Human-readable schema with property types and options |
| `databases_properties` | `notion databases properties -d <id>` | Flat list of property names and types |
| `databases_query` | `notion databases query -d <id>` | Query rows with filters and sorts |
| `databases_create` | `notion databases create --parent-page-id <id> -t "Title"` | Create a database under a page |
| `databases_update` | `notion databases update -d <id> -t "New Title"` | Update title, description, or archive |

**databases_query filter examples:**
```bash
# Single condition
--filter '{"property":"Status","select":{"equals":"Done"}}'

# Text property contains
--filter '{"property":"Name","rich_text":{"contains":"meeting"}}'

# Checkbox is true
--filter '{"property":"Done","checkbox":{"equals":true}}'

# Compound AND
--filter '{"and":[{"property":"Status","select":{"equals":"Active"}},{"property":"Priority","select":{"equals":"High"}}]}'
```

**databases_query sort examples:**
```bash
--sorts '[{"property":"Name","direction":"ascending"}]'
--sorts '[{"timestamp":"last_edited_time","direction":"descending"}]'
```

---

### pages

| MCP Tool | CLI | Description |
|---|---|---|
| `pages_get` | `notion pages get -p <id>` | Retrieve page + properties |
| `pages_create` | `notion pages create` | Create page (child or database row) |
| `pages_update` | `notion pages update -p <id>` | Update page properties |
| `pages_archive` | `notion pages archive -p <id>` | Move to trash |
| `pages_restore` | `notion pages restore -p <id>` | Restore from trash |
| `pages_property` | `notion pages property -p <id> --property-id <id>` | Get single property (for >25 references) |
| `pages_content` | `notion pages content -p <id>` | Get page blocks |
| `pages_markdown` | `notion pages markdown -p <id>` | Get page as Markdown text |

**Create a database row:**
```bash
notion pages create \
  --parent-database-id <db_id> \
  --properties '{"Name":{"title":[{"text":{"content":"New Item"}}]},"Status":{"select":{"name":"In Progress"}}}'
```

**Update a property:**
```bash
notion pages update -p <id> \
  --properties '{"Status":{"select":{"name":"Done"}}}'
```

---

### blocks

| MCP Tool | CLI | Description |
|---|---|---|
| `blocks_get` | `notion blocks get -b <id>` | Get a single block |
| `blocks_children` | `notion blocks children -b <id>` | List block children (one level) |
| `blocks_append` | `notion blocks append -b <id>` | Append blocks to a page or block |
| `blocks_update` | `notion blocks update -b <id>` | Update block content |
| `blocks_delete` | `notion blocks delete -b <id>` | Delete a block |

**Append shorthand (agents use this):**
```bash
notion blocks append -b <page_id> --type paragraph --text "Hello world"
notion blocks append -b <page_id> --type heading_1 --text "Section Title"
notion blocks append -b <page_id> --type heading_2 --text "Subsection"
notion blocks append -b <page_id> --type to_do --text "Task item" --checked false
notion blocks append -b <page_id> --type bulleted_list_item --text "List item"
notion blocks append -b <page_id> --type numbered_list_item --text "Step 1"
notion blocks append -b <page_id> --type code --text "const x = 1;" --language typescript
notion blocks append -b <page_id> --type quote --text "Famous quote"
notion blocks append -b <page_id> --type callout --text "Important note"
notion blocks append -b <page_id> --type divider
```

**Block children only returns one level.** To read full page content recursively, call `blocks_children` on each block with `has_children: true`.

---

### users

| MCP Tool | CLI | Description |
|---|---|---|
| `users_list` | `notion users list` | List workspace members (not guests) |
| `users_get` | `notion users get -u <id>` | Get a specific user |
| `users_me` | `notion users me` | Get the bot user (confirms auth) |

---

### comments

| MCP Tool | CLI | Description |
|---|---|---|
| `comments_list` | `notion comments list -b <id>` | List comments on a page or block |
| `comments_create` | `notion comments create -t "text"` | Add a comment |

**Create a page-level comment:**
```bash
notion comments create --page-id <id> --text "Looks good, approved!"
```

---

### search

| MCP Tool | CLI | Description |
|---|---|---|
| `search_all` | `notion search all -q "query"` | Search pages + databases by title |
| `search_pages` | `notion search pages -q "query"` | Search pages only |
| `search_databases` | `notion search databases -q "query"` | Search databases only |

> Search matches **titles only**, not body content. Omit `--query` to list all shared items.

---

### workspace

| MCP Tool | CLI | Description |
|---|---|---|
| `workspace_info` | `notion workspace info` | Verify auth + workspace details |

---

## Common Agent Workflows

### Read a database and process rows
```bash
# 1. Discover schema
notion databases schema -d <id> --pretty

# 2. Query with filter, flatten for easy parsing
notion databases query -d <id> \
  --filter '{"property":"Status","select":{"equals":"Active"}}' \
  --flat --pretty

# 3. Get full content of a specific page
notion pages markdown --page-id <page_id>
```

### Create a structured page with content
```bash
# 1. Create the page
PAGE=$(notion pages create --parent-page-id <id> --title "Meeting Notes 2026-03-20")
PAGE_ID=$(echo $PAGE | jq -r '.id')

# 2. Add structure
notion blocks append -b $PAGE_ID --type heading_1 --text "Attendees"
notion blocks append -b $PAGE_ID --type bulleted_list_item --text "Brandon"
notion blocks append -b $PAGE_ID --type heading_1 --text "Action Items"
notion blocks append -b $PAGE_ID --type to_do --text "Follow up with client"
```

### Update a database row's status
```bash
notion pages update -p <page_id> \
  --properties '{"Status":{"select":{"name":"Done"}}}'
```

---

## MCP Tool Names

All 29 tools follow `<group>_<subcommand>` naming:

```
databases_list       databases_get        databases_schema
databases_properties databases_query      databases_create
databases_update     pages_get            pages_create
pages_update         pages_archive        pages_restore
pages_property       pages_content        pages_markdown
blocks_get           blocks_children      blocks_append
blocks_update        blocks_delete        users_list
users_get            users_me             comments_list
comments_create      search_all           search_pages
search_databases     workspace_info
```

---

## Error Handling

Errors return JSON on stderr:
```json
{"error": "object_not_found", "code": "object_not_found", "status": 404}
```

Common errors:
- `object_not_found` (404) — page/database not shared with integration
- `unauthorized` (401) — invalid token
- `restricted_resource` (403) — integration lacks required capability
- `rate_limited` (429) — exceeded 3 req/sec, retry after delay
- `validation_error` (400) — invalid filter JSON or missing required field
