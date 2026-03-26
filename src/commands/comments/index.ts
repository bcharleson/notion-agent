import { z } from 'zod';
import { toRichText } from '../../core/output.js';
import type { CommandDefinition } from '../../core/types.js';

export const commentCommands: CommandDefinition[] = [
  {
    name: 'comments_list',
    group: 'comments',
    subcommand: 'list',
    description: 'List all comments on a page or block',
    inputSchema: z.object({
      block_id: z.string().describe('The page or block ID to list comments for'),
      page_size: z.coerce.number().min(1).max(100).default(20).optional(),
      start_cursor: z.string().optional(),
    }),
    cliMappings: {
      options: [
        { field: 'block_id', flags: '-b, --block-id <id>', description: 'Page or block ID', required: true },
        { field: 'page_size', flags: '--page-size <n>', description: 'Results per page (default: 20)' },
        { field: 'start_cursor', flags: '--start-cursor <cursor>', description: 'Pagination cursor' },
      ],
    },
    handler: async (input, client) => {
      return client.comments.list({
        block_id: input.block_id as string,
        page_size: input.page_size as number | undefined,
        start_cursor: input.start_cursor as string | undefined,
      });
    },
  },

  {
    name: 'comments_create',
    group: 'comments',
    subcommand: 'create',
    description: 'Add a comment to a page or block. Requires read/write comment capabilities.',
    inputSchema: z.object({
      page_id: z.string().optional().describe('Page ID (for page-level comments)'),
      discussion_id: z.string().optional().describe('Discussion ID (for inline comments)'),
      text: z.string().describe('The comment text'),
    }),
    cliMappings: {
      options: [
        { field: 'page_id', flags: '-p, --page-id <id>', description: 'Page ID for page-level comment' },
        { field: 'discussion_id', flags: '--discussion-id <id>', description: 'Discussion ID for inline comment' },
        { field: 'text', flags: '-t, --text <text>', description: 'Comment text', required: true },
      ],
    },
    handler: async (input, client) => {
      if (!input.page_id && !input.discussion_id) {
        throw new Error('Provide either --page-id or --discussion-id');
      }
      const params: Record<string, unknown> = {
        rich_text: toRichText(input.text as string),
      };
      if (input.page_id) {
        params.parent = { page_id: input.page_id };
      } else {
        params.discussion_id = input.discussion_id;
      }
      return client.comments.create(params as Parameters<typeof client.comments.create>[0]);
    },
  },
];
