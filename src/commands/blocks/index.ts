import { z } from 'zod';
import { toRichText } from '../../core/output.js';
import type { CommandDefinition } from '../../core/types.js';

type BlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bulleted_list_item'
  | 'numbered_list_item'
  | 'to_do'
  | 'toggle'
  | 'code'
  | 'quote'
  | 'callout'
  | 'divider';

function buildBlock(
  type: BlockType,
  text: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  if (type === 'divider') {
    return { object: 'block', type: 'divider', divider: {} };
  }
  const content = { rich_text: toRichText(text), ...extra };
  return { object: 'block', type, [type]: content };
}

export const blockCommands: CommandDefinition[] = [
  {
    name: 'blocks_get',
    group: 'blocks',
    subcommand: 'get',
    description: 'Retrieve a single block by ID',
    inputSchema: z.object({
      block_id: z.string().describe('The block ID (UUID)'),
    }),
    cliMappings: {
      options: [
        { field: 'block_id', flags: '-b, --block-id <id>', description: 'Block ID', required: true },
      ],
    },
    handler: async (input, client) => {
      return client.blocks.retrieve({ block_id: input.block_id as string });
    },
  },

  {
    name: 'blocks_children',
    group: 'blocks',
    subcommand: 'children',
    description: 'List the immediate children of a block or page (one level deep)',
    inputSchema: z.object({
      block_id: z.string().describe('The block or page ID (UUID)'),
      page_size: z.coerce.number().min(1).max(100).default(50).optional(),
      start_cursor: z.string().optional(),
    }),
    cliMappings: {
      options: [
        { field: 'block_id', flags: '-b, --block-id <id>', description: 'Block or page ID', required: true },
        { field: 'page_size', flags: '--page-size <n>', description: 'Results per page (default: 50)' },
        { field: 'start_cursor', flags: '--start-cursor <cursor>', description: 'Pagination cursor' },
      ],
    },
    handler: async (input, client) => {
      return client.blocks.children.list({
        block_id: input.block_id as string,
        page_size: input.page_size as number | undefined,
        start_cursor: input.start_cursor as string | undefined,
      });
    },
  },

  {
    name: 'blocks_append',
    group: 'blocks',
    subcommand: 'append',
    description: 'Append new blocks to a page or block. Use --type and --text for simple blocks, or --blocks for raw JSON.',
    inputSchema: z.object({
      block_id: z.string().describe('The parent block or page ID'),
      type: z
        .enum([
          'paragraph',
          'heading_1',
          'heading_2',
          'heading_3',
          'bulleted_list_item',
          'numbered_list_item',
          'to_do',
          'toggle',
          'code',
          'quote',
          'callout',
          'divider',
        ])
        .optional()
        .describe('Block type (use with --text)'),
      text: z.string().optional().describe('Text content (used with --type)'),
      checked: z.boolean().optional().describe('Checked state for to_do blocks'),
      language: z.string().optional().describe('Language for code blocks (e.g. typescript)'),
      blocks: z.string().optional().describe('Raw JSON array of block objects'),
    }),
    cliMappings: {
      options: [
        { field: 'block_id', flags: '-b, --block-id <id>', description: 'Parent block or page ID', required: true },
        { field: 'type', flags: '--type <type>', description: 'Block type (paragraph, heading_1, to_do, code, etc.)' },
        { field: 'text', flags: '--text <text>', description: 'Text content for the block' },
        { field: 'checked', flags: '--checked', description: 'Mark to_do as checked' },
        { field: 'language', flags: '--language <lang>', description: 'Language for code blocks' },
        { field: 'blocks', flags: '--blocks <json>', description: 'Raw JSON block array (advanced)' },
      ],
    },
    handler: async (input, client) => {
      let children: unknown[];

      if (input.blocks) {
        children = JSON.parse(input.blocks as string) as unknown[];
      } else if (input.type && input.text !== undefined) {
        const extra: Record<string, unknown> = {};
        if (input.type === 'to_do') extra.checked = input.checked ?? false;
        if (input.type === 'code') extra.language = input.language ?? 'plain text';
        children = [buildBlock(input.type as BlockType, input.text as string, extra)];
      } else {
        throw new Error('Provide either --type + --text OR --blocks <json>');
      }

      return client.blocks.children.append({
        block_id: input.block_id as string,
        children: children as Parameters<typeof client.blocks.children.append>[0]['children'],
      });
    },
  },

  {
    name: 'blocks_update',
    group: 'blocks',
    subcommand: 'update',
    description: 'Update block content. Provide --type and --text for text blocks, or --data for raw JSON.',
    inputSchema: z.object({
      block_id: z.string().describe('The block ID (UUID)'),
      type: z
        .enum([
          'paragraph',
          'heading_1',
          'heading_2',
          'heading_3',
          'bulleted_list_item',
          'numbered_list_item',
          'to_do',
          'toggle',
          'code',
          'quote',
          'callout',
        ])
        .optional(),
      text: z.string().optional().describe('New text content'),
      data: z.string().optional().describe('Raw JSON block update object'),
    }),
    cliMappings: {
      options: [
        { field: 'block_id', flags: '-b, --block-id <id>', description: 'Block ID', required: true },
        { field: 'type', flags: '--type <type>', description: 'Block type' },
        { field: 'text', flags: '--text <text>', description: 'New text content' },
        { field: 'data', flags: '--data <json>', description: 'Raw JSON update object' },
      ],
    },
    handler: async (input, client) => {
      let params: Record<string, unknown> = { block_id: input.block_id as string };
      if (input.data) {
        params = { ...params, ...(JSON.parse(input.data as string) as Record<string, unknown>) };
      } else if (input.type && input.text !== undefined) {
        params[input.type as string] = { rich_text: toRichText(input.text as string) };
      }
      return client.blocks.update(params as Parameters<typeof client.blocks.update>[0]);
    },
  },

  {
    name: 'blocks_delete',
    group: 'blocks',
    subcommand: 'delete',
    description: 'Delete a block (sets in_trash: true — this is reversible from Notion)',
    inputSchema: z.object({
      block_id: z.string().describe('The block ID (UUID)'),
    }),
    cliMappings: {
      options: [
        { field: 'block_id', flags: '-b, --block-id <id>', description: 'Block ID', required: true },
      ],
    },
    handler: async (input, client) => {
      return client.blocks.delete({ block_id: input.block_id as string });
    },
  },
];
