import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ALL_COMMANDS } from '../commands/index.js';
import { NotionClient } from '../core/client.js';
import { resolveToken } from '../core/config.js';
import { formatError } from '../core/errors.js';

const MCP_HELP = `notion-mcp — Notion MCP server for Claude Code, Claude Desktop, and Cursor

Usage:
  notion-mcp                    Start the MCP server (reads NOTION_TOKEN env var)
  NOTION_TOKEN=<token> notion-mcp

MCP tools exposed (29 total):
  databases_list  databases_get    databases_schema  databases_properties
  databases_query databases_create databases_update
  pages_get       pages_create     pages_update      pages_archive
  pages_restore   pages_property   pages_content     pages_markdown
  blocks_get      blocks_children  blocks_append     blocks_update
  blocks_delete   users_list       users_get         users_me
  comments_list   comments_create  search_all        search_pages
  search_databases workspace_info

Claude Code setup:
  claude mcp add notion -- notion-mcp

Authentication:
  Set NOTION_TOKEN environment variable before starting the server.
  Token format: secret_... or ntn_...
`;

export async function startMcpServer(): Promise<void> {
  // Handle --help without requiring auth
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    process.stdout.write(MCP_HELP);
    process.exit(0);
  }

  const token = resolveToken();
  const client = new NotionClient(token);

  const server = new McpServer({
    name: 'notion',
    version: '0.1.0',
  });

  for (const cmd of ALL_COMMANDS) {
    server.registerTool(
      cmd.name,
      {
        description: cmd.description,
        inputSchema: cmd.inputSchema.shape,
      },
      async (args: Record<string, unknown>) => {
        try {
          const result = await cmd.handler(args, client);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(formatError(error), null, 2),
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
