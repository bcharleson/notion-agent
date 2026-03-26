import type { ZodObject, ZodRawShape } from 'zod';
import type { NotionClient } from './client.js';

export interface CliOption {
  field: string;
  flags: string;
  description: string;
  required?: boolean;
  defaultValue?: unknown;
}

export interface CliArg {
  field: string;
  name: string;
  description: string;
  required?: boolean;
}

export interface CliMappings {
  options?: CliOption[];
  args?: CliArg[];
}

export interface CommandDefinition<T extends ZodRawShape = ZodRawShape> {
  /** MCP tool name: "databases_query" */
  name: string;
  /** CLI group: "databases" */
  group: string;
  /** CLI subcommand: "query" */
  subcommand: string;
  description: string;
  inputSchema: ZodObject<T>;
  cliMappings: CliMappings;
  handler: (input: Record<string, unknown>, client: NotionClient) => Promise<unknown>;
}

export interface GlobalOptions {
  token?: string;
  pretty?: boolean;
  quiet?: boolean;
  fields?: string;
  flat?: boolean;
}
