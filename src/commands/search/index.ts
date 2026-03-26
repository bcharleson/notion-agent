import { z } from 'zod';
import type { CommandDefinition } from '../../core/types.js';

export const searchCommands: CommandDefinition[] = [
  {
    name: 'search_all',
    group: 'search',
    subcommand: 'all',
    description: 'Search all pages and databases shared with this integration by title',
    inputSchema: z.object({
      query: z.string().optional().describe('Search query (matches on title only)'),
      sort_direction: z
        .enum(['ascending', 'descending'])
        .default('descending')
        .optional()
        .describe('Sort direction by last_edited_time'),
      page_size: z.coerce.number().min(1).max(100).default(20).optional(),
      start_cursor: z.string().optional(),
    }),
    cliMappings: {
      options: [
        { field: 'query', flags: '-q, --query <text>', description: 'Search query (title match)' },
        {
          field: 'sort_direction',
          flags: '--sort <direction>',
          description: 'Sort direction: ascending | descending (default: descending)',
        },
        { field: 'page_size', flags: '--page-size <n>', description: 'Results per page (default: 20)' },
        { field: 'start_cursor', flags: '--start-cursor <cursor>', description: 'Pagination cursor' },
      ],
    },
    handler: async (input, client) => {
      return client.search({
        query: input.query as string | undefined,
        sort: {
          direction: (input.sort_direction as 'ascending' | 'descending') ?? 'descending',
          timestamp: 'last_edited_time',
        },
        page_size: input.page_size as number | undefined,
        start_cursor: input.start_cursor as string | undefined,
      });
    },
  },

  {
    name: 'search_pages',
    group: 'search',
    subcommand: 'pages',
    description: 'Search pages shared with this integration by title',
    inputSchema: z.object({
      query: z.string().optional().describe('Search query (matches on title only)'),
      page_size: z.coerce.number().min(1).max(100).default(20).optional(),
      start_cursor: z.string().optional(),
    }),
    cliMappings: {
      options: [
        { field: 'query', flags: '-q, --query <text>', description: 'Search query (title match)' },
        { field: 'page_size', flags: '--page-size <n>', description: 'Results per page (default: 20)' },
        { field: 'start_cursor', flags: '--start-cursor <cursor>', description: 'Pagination cursor' },
      ],
    },
    handler: async (input, client) => {
      return client.search({
        query: input.query as string | undefined,
        filter: { property: 'object', value: 'page' },
        page_size: input.page_size as number | undefined,
        start_cursor: input.start_cursor as string | undefined,
      });
    },
  },

  {
    name: 'search_databases',
    group: 'search',
    subcommand: 'databases',
    description: 'Search databases shared with this integration by title',
    inputSchema: z.object({
      query: z.string().optional().describe('Search query (matches on title only)'),
      page_size: z.coerce.number().min(1).max(100).default(20).optional(),
      start_cursor: z.string().optional(),
    }),
    cliMappings: {
      options: [
        { field: 'query', flags: '-q, --query <text>', description: 'Search query (title match)' },
        { field: 'page_size', flags: '--page-size <n>', description: 'Results per page (default: 20)' },
        { field: 'start_cursor', flags: '--start-cursor <cursor>', description: 'Pagination cursor' },
      ],
    },
    handler: async (input, client) => {
      return client.search({
        query: input.query as string | undefined,
        filter: { property: 'object', value: 'database' },
        page_size: input.page_size as number | undefined,
        start_cursor: input.start_cursor as string | undefined,
      });
    },
  },
];
