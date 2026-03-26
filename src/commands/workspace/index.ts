import { z } from 'zod';
import type { CommandDefinition } from '../../core/types.js';

export const workspaceCommands: CommandDefinition[] = [
  {
    name: 'workspace_info',
    group: 'workspace',
    subcommand: 'info',
    description: 'Verify authentication and show workspace name, bot identity, and integration owner',
    inputSchema: z.object({}),
    cliMappings: { options: [] },
    handler: async (_input, client) => {
      const me = await client.users.me({});
      return {
        authenticated: true,
        bot_id: me.id,
        bot_name: me.name,
        workspace_name: (me as Record<string, unknown>).bot
          ? ((me as Record<string, unknown>).bot as Record<string, unknown>).workspace_name
          : null,
        owner: (me as Record<string, unknown>).bot
          ? ((me as Record<string, unknown>).bot as Record<string, unknown>).owner
          : null,
      };
    },
  },
];
