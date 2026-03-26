import { z } from 'zod';
import type { CommandDefinition } from '../../core/types.js';

export const databaseCommands: CommandDefinition[] = [
  {
    name: 'databases_list',
    group: 'databases',
    subcommand: 'list',
    description: 'List all databases the integration can access (searches shared databases)',
    inputSchema: z.object({
      query: z.string().optional().describe('Filter databases by title'),
      page_size: z.coerce.number().min(1).max(100).default(20).describe('Results per page (max 100)'),
      start_cursor: z.string().optional().describe('Pagination cursor from previous response'),
    }),
    cliMappings: {
      options: [
        { field: 'query', flags: '-q, --query <text>', description: 'Filter by title' },
        { field: 'page_size', flags: '--page-size <n>', description: 'Results per page (default: 20)' },
        { field: 'start_cursor', flags: '--start-cursor <cursor>', description: 'Pagination cursor' },
      ],
    },
    handler: async (input, client) => {
      return client.search({
        query: input.query as string | undefined,
        filter: { property: 'object', value: 'database' },
        page_size: input.page_size as number,
        start_cursor: input.start_cursor as string | undefined,
      });
    },
  },

  {
    name: 'databases_get',
    group: 'databases',
    subcommand: 'get',
    description: 'Retrieve a database — returns title, description, icon, and full property schema',
    inputSchema: z.object({
      database_id: z.string().describe('The database ID (UUID)'),
    }),
    cliMappings: {
      options: [
        { field: 'database_id', flags: '-d, --database-id <id>', description: 'Database ID', required: true },
      ],
    },
    handler: async (input, client) => {
      return client.databases.retrieve({ database_id: input.database_id as string });
    },
  },

  {
    name: 'databases_schema',
    group: 'databases',
    subcommand: 'schema',
    description: 'Show a human-readable schema for a database — property names, types, and options',
    inputSchema: z.object({
      database_id: z.string().describe('The database ID (UUID)'),
    }),
    cliMappings: {
      options: [
        { field: 'database_id', flags: '-d, --database-id <id>', description: 'Database ID', required: true },
      ],
    },
    handler: async (input, client) => {
      const db = await client.databases.retrieve({ database_id: input.database_id as string });
      const schema: Record<string, unknown> = {};
      for (const [name, prop] of Object.entries(db.properties)) {
        const p = prop as Record<string, unknown>;
        const entry: Record<string, unknown> = { type: p.type };
        if (p.type === 'select' || p.type === 'multi_select' || p.type === 'status') {
          const opts = ((p[p.type as string] as Record<string, unknown>)?.options as Array<{ name?: string }>) ?? [];
          entry.options = opts.map((o) => o.name);
        }
        if (p.type === 'formula') {
          entry.expression = (p.formula as Record<string, unknown>)?.expression;
        }
        if (p.type === 'relation') {
          entry.related_database_id = (p.relation as Record<string, unknown>)?.database_id;
        }
        schema[name] = entry;
      }
      return { database_id: db.id, title: db.title, schema };
    },
  },

  {
    name: 'databases_query',
    group: 'databases',
    subcommand: 'query',
    description: 'Query a database — returns matching pages with full property values. Use --filter for complex filtering.',
    inputSchema: z.object({
      database_id: z.string().describe('The database ID (UUID)'),
      filter: z.string().optional().describe('JSON filter object, e.g. {"property":"Status","select":{"equals":"Done"}}'),
      sorts: z.string().optional().describe('JSON sorts array, e.g. [{"property":"Name","direction":"ascending"}]'),
      page_size: z.coerce.number().min(1).max(100).default(20).describe('Results per page (max 100)'),
      start_cursor: z.string().optional().describe('Pagination cursor from previous response'),
      filter_properties: z.string().optional().describe('Comma-separated property IDs to include in response'),
    }),
    cliMappings: {
      options: [
        { field: 'database_id', flags: '-d, --database-id <id>', description: 'Database ID', required: true },
        { field: 'filter', flags: '-f, --filter <json>', description: 'JSON filter object' },
        { field: 'sorts', flags: '--sorts <json>', description: 'JSON sorts array' },
        { field: 'page_size', flags: '--page-size <n>', description: 'Results per page (default: 20)' },
        { field: 'start_cursor', flags: '--start-cursor <cursor>', description: 'Pagination cursor' },
        { field: 'filter_properties', flags: '--filter-properties <ids>', description: 'Comma-separated property IDs' },
      ],
    },
    handler: async (input, client) => {
      const params: Record<string, unknown> = {
        database_id: input.database_id as string,
        page_size: input.page_size as number,
      };
      if (input.filter) params.filter = JSON.parse(input.filter as string);
      if (input.sorts) params.sorts = JSON.parse(input.sorts as string);
      if (input.start_cursor) params.start_cursor = input.start_cursor as string;
      if (input.filter_properties) {
        params.filter_properties = (input.filter_properties as string).split(',').map((s) => s.trim());
      }
      return client.databases.query(params as Parameters<typeof client.databases.query>[0]);
    },
  },

  {
    name: 'databases_create',
    group: 'databases',
    subcommand: 'create',
    description: 'Create a new database as a child of a page',
    inputSchema: z.object({
      parent_page_id: z.string().describe('ID of the parent page'),
      title: z.string().describe('Database title'),
      description: z.string().optional().describe('Database description'),
      is_inline: z.boolean().optional().default(false).describe('Display inline on parent page'),
    }),
    cliMappings: {
      options: [
        { field: 'parent_page_id', flags: '-p, --parent-page-id <id>', description: 'Parent page ID', required: true },
        { field: 'title', flags: '-t, --title <title>', description: 'Database title', required: true },
        { field: 'description', flags: '--description <text>', description: 'Database description' },
        { field: 'is_inline', flags: '--inline', description: 'Display inline on parent page' },
      ],
    },
    handler: async (input, client) => {
      return client.databases.create({
        parent: { type: 'page_id', page_id: input.parent_page_id as string },
        title: [{ type: 'text', text: { content: input.title as string } }],
        description: input.description
          ? [{ type: 'text', text: { content: input.description as string } }]
          : undefined,
        is_inline: input.is_inline as boolean,
        properties: {
          Name: { title: {} },
        },
      });
    },
  },

  {
    name: 'databases_update',
    group: 'databases',
    subcommand: 'update',
    description: 'Update a database title, description, icon, or cover',
    inputSchema: z.object({
      database_id: z.string().describe('The database ID (UUID)'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      in_trash: z.boolean().optional().describe('Archive (true) or restore (false) the database'),
    }),
    cliMappings: {
      options: [
        { field: 'database_id', flags: '-d, --database-id <id>', description: 'Database ID', required: true },
        { field: 'title', flags: '-t, --title <title>', description: 'New title' },
        { field: 'description', flags: '--description <text>', description: 'New description' },
        { field: 'in_trash', flags: '--archive', description: 'Archive this database' },
      ],
    },
    handler: async (input, client) => {
      const params: Record<string, unknown> = { database_id: input.database_id as string };
      if (input.title !== undefined) {
        params.title = [{ type: 'text', text: { content: input.title } }];
      }
      if (input.description !== undefined) {
        params.description = [{ type: 'text', text: { content: input.description } }];
      }
      if (input.in_trash !== undefined) params.in_trash = input.in_trash;
      return client.databases.update(params as Parameters<typeof client.databases.update>[0]);
    },
  },

  {
    name: 'databases_properties',
    group: 'databases',
    subcommand: 'properties',
    description: 'List all property names and types in a database as a flat table',
    inputSchema: z.object({
      database_id: z.string().describe('The database ID (UUID)'),
    }),
    cliMappings: {
      options: [
        { field: 'database_id', flags: '-d, --database-id <id>', description: 'Database ID', required: true },
      ],
    },
    handler: async (input, client) => {
      const db = await client.databases.retrieve({ database_id: input.database_id as string });
      const properties = Object.entries(db.properties).map(([name, prop]) => ({
        name,
        type: (prop as Record<string, unknown>).type,
        id: (prop as Record<string, unknown>).id,
      }));
      return { database_id: db.id, count: properties.length, properties };
    },
  },
];
