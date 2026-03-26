import { z } from 'zod';
import type { CommandDefinition } from '../../core/types.js';

export const userCommands: CommandDefinition[] = [
  {
    name: 'users_list',
    group: 'users',
    subcommand: 'list',
    description: 'List all workspace members (excludes guests; requires user info capability)',
    inputSchema: z.object({
      page_size: z.coerce.number().min(1).max(100).default(20).optional(),
      start_cursor: z.string().optional(),
    }),
    cliMappings: {
      options: [
        { field: 'page_size', flags: '--page-size <n>', description: 'Results per page (default: 20)' },
        { field: 'start_cursor', flags: '--start-cursor <cursor>', description: 'Pagination cursor' },
      ],
    },
    handler: async (input, client) => {
      return client.users.list({
        page_size: input.page_size as number | undefined,
        start_cursor: input.start_cursor as string | undefined,
      });
    },
  },

  {
    name: 'users_get',
    group: 'users',
    subcommand: 'get',
    description: 'Retrieve a specific user by ID',
    inputSchema: z.object({
      user_id: z.string().describe('The user ID (UUID)'),
    }),
    cliMappings: {
      options: [
        { field: 'user_id', flags: '-u, --user-id <id>', description: 'User ID', required: true },
      ],
    },
    handler: async (input, client) => {
      return client.users.retrieve({ user_id: input.user_id as string });
    },
  },

  {
    name: 'users_me',
    group: 'users',
    subcommand: 'me',
    description: 'Retrieve the bot user for this integration — confirms auth and shows workspace info',
    inputSchema: z.object({}),
    cliMappings: { options: [] },
    handler: async (_input, client) => {
      return client.users.me({});
    },
  },
];
