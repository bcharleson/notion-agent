import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ALL_COMMANDS } from '../commands/index.js';
import { NotionClient } from '../core/client.js';
import { resolveToken } from '../core/config.js';
import { formatError } from '../core/errors.js';

export async function startMcpServer(): Promise<void> {
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
