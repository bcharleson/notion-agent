import { z } from 'zod';
import { toRichText } from '../../core/output.js';
import type { CommandDefinition } from '../../core/types.js';

export const pageCommands: CommandDefinition[] = [
  {
    name: 'pages_get',
    group: 'pages',
    subcommand: 'get',
    description: 'Retrieve a page and its properties',
    inputSchema: z.object({
      page_id: z.string().describe('The page ID (UUID)'),
      filter_properties: z.string().optional().describe('Comma-separated property IDs/names to include'),
    }),
    cliMappings: {
      options: [
        { field: 'page_id', flags: '-p, --page-id <id>', description: 'Page ID', required: true },
        { field: 'filter_properties', flags: '--filter-properties <ids>', description: 'Comma-separated property IDs' },
      ],
    },
    handler: async (input, client) => {
      const params: Record<string, unknown> = { page_id: input.page_id as string };
      if (input.filter_properties) {
        params.filter_properties = (input.filter_properties as string).split(',').map((s) => s.trim());
      }
      return client.pages.retrieve(params as Parameters<typeof client.pages.retrieve>[0]);
    },
  },

  {
    name: 'pages_create',
    group: 'pages',
    subcommand: 'create',
    description: 'Create a new page — either as a child of a page or as a row in a database',
    inputSchema: z.object({
      parent_page_id: z.string().optional().describe('Parent page ID (for child pages)'),
      parent_database_id: z.string().optional().describe('Parent database ID (for database rows)'),
      title: z.string().optional().describe('Page title (sets the title property)'),
      properties: z.string().optional().describe('JSON properties object for database rows'),
      content: z.string().optional().describe('Plain text content to add as the first paragraph'),
    }),
    cliMappings: {
      options: [
        { field: 'parent_page_id', flags: '--parent-page-id <id>', description: 'Parent page ID' },
        { field: 'parent_database_id', flags: '--parent-database-id <id>', description: 'Parent database ID' },
        { field: 'title', flags: '-t, --title <text>', description: 'Page title' },
        { field: 'properties', flags: '--properties <json>', description: 'JSON properties (for database rows)' },
        { field: 'content', flags: '--content <text>', description: 'Initial paragraph text' },
      ],
    },
    handler: async (input, client) => {
      if (!input.parent_page_id && !input.parent_database_id) {
        throw new Error('One of --parent-page-id or --parent-database-id is required');
      }
      const parent = input.parent_database_id
        ? { type: 'database_id' as const, database_id: input.parent_database_id as string }
        : { type: 'page_id' as const, page_id: input.parent_page_id as string };

      let properties: Record<string, unknown> = {};
      if (input.properties) {
        properties = JSON.parse(input.properties as string) as Record<string, unknown>;
      } else if (input.title) {
        properties = {
          title: { title: toRichText(input.title as string) },
        };
      }

      const children = input.content
        ? [
            {
              object: 'block' as const,
              type: 'paragraph' as const,
              paragraph: { rich_text: toRichText(input.content as string) },
            },
          ]
        : undefined;

      return client.pages.create({ parent, properties, children } as Parameters<typeof client.pages.create>[0]);
    },
  },

  {
    name: 'pages_update',
    group: 'pages',
    subcommand: 'update',
    description: 'Update page properties, icon, or cover',
    inputSchema: z.object({
      page_id: z.string().describe('The page ID (UUID)'),
      properties: z.string().optional().describe('JSON properties object to update'),
      title: z.string().optional().describe('New title (shorthand for updating title property)'),
    }),
    cliMappings: {
      options: [
        { field: 'page_id', flags: '-p, --page-id <id>', description: 'Page ID', required: true },
        { field: 'properties', flags: '--properties <json>', description: 'JSON properties to update' },
        { field: 'title', flags: '-t, --title <text>', description: 'New title (shorthand)' },
      ],
    },
    handler: async (input, client) => {
      let properties: Record<string, unknown> = {};
      if (input.properties) {
        properties = JSON.parse(input.properties as string) as Record<string, unknown>;
      } else if (input.title) {
        properties = {
          title: { title: toRichText(input.title as string) },
        };
      }
      return client.pages.update({
        page_id: input.page_id as string,
        properties,
      } as Parameters<typeof client.pages.update>[0]);
    },
  },

  {
    name: 'pages_archive',
    group: 'pages',
    subcommand: 'archive',
    description: 'Archive (soft delete) a page — the page moves to trash',
    inputSchema: z.object({
      page_id: z.string().describe('The page ID (UUID)'),
    }),
    cliMappings: {
      options: [
        { field: 'page_id', flags: '-p, --page-id <id>', description: 'Page ID', required: true },
      ],
    },
    handler: async (input, client) => {
      return client.pages.update({
        page_id: input.page_id as string,
        in_trash: true,
      } as Parameters<typeof client.pages.update>[0]);
    },
  },

  {
    name: 'pages_restore',
    group: 'pages',
    subcommand: 'restore',
    description: 'Restore an archived page from trash',
    inputSchema: z.object({
      page_id: z.string().describe('The page ID (UUID)'),
    }),
    cliMappings: {
      options: [
        { field: 'page_id', flags: '-p, --page-id <id>', description: 'Page ID', required: true },
      ],
    },
    handler: async (input, client) => {
      return client.pages.update({
        page_id: input.page_id as string,
        in_trash: false,
      } as Parameters<typeof client.pages.update>[0]);
    },
  },

  {
    name: 'pages_property',
    group: 'pages',
    subcommand: 'property',
    description: 'Retrieve a single page property item — use for properties with more than 25 references',
    inputSchema: z.object({
      page_id: z.string().describe('The page ID (UUID)'),
      property_id: z.string().describe('The property ID or name'),
      page_size: z.coerce.number().min(1).max(100).default(25).optional(),
      start_cursor: z.string().optional(),
    }),
    cliMappings: {
      options: [
        { field: 'page_id', flags: '-p, --page-id <id>', description: 'Page ID', required: true },
        { field: 'property_id', flags: '--property-id <id>', description: 'Property ID or name', required: true },
        { field: 'page_size', flags: '--page-size <n>', description: 'Results per page' },
        { field: 'start_cursor', flags: '--start-cursor <cursor>', description: 'Pagination cursor' },
      ],
    },
    handler: async (input, client) => {
      return client.pages.properties.retrieve({
        page_id: input.page_id as string,
        property_id: input.property_id as string,
        page_size: input.page_size as number | undefined,
        start_cursor: input.start_cursor as string | undefined,
      });
    },
  },

  {
    name: 'pages_content',
    group: 'pages',
    subcommand: 'content',
    description: 'Get page content as blocks — returns the first level of block children',
    inputSchema: z.object({
      page_id: z.string().describe('The page ID (UUID)'),
      page_size: z.coerce.number().min(1).max(100).default(50).optional(),
      start_cursor: z.string().optional(),
    }),
    cliMappings: {
      options: [
        { field: 'page_id', flags: '-p, --page-id <id>', description: 'Page ID', required: true },
        { field: 'page_size', flags: '--page-size <n>', description: 'Blocks per page (default: 50)' },
        { field: 'start_cursor', flags: '--start-cursor <cursor>', description: 'Pagination cursor' },
      ],
    },
    handler: async (input, client) => {
      return client.blocks.children.list({
        block_id: input.page_id as string,
        page_size: input.page_size as number | undefined,
        start_cursor: input.start_cursor as string | undefined,
      });
    },
  },

  {
    name: 'pages_markdown',
    group: 'pages',
    subcommand: 'markdown',
    description: 'Retrieve a page as Markdown — ideal for agents that need to read page content as text',
    inputSchema: z.object({
      page_id: z.string().describe('The page ID (UUID)'),
    }),
    cliMappings: {
      options: [
        { field: 'page_id', flags: '-p, --page-id <id>', description: 'Page ID', required: true },
      ],
    },
    handler: async (input, client) => {
      // Use raw fetch — Markdown endpoint not yet in @notionhq/client SDK
      const res = await fetch(
        `https://api.notion.com/v1/pages/${input.page_id as string}/markdown`,
        {
          headers: {
            Authorization: `Bearer ${client.token}`,
            'Notion-Version': '2022-06-28',
          },
        }
      );
      if (!res.ok) {
        const err = await res.json() as Record<string, unknown>;
        throw new Error((err.message as string) ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  },
];
