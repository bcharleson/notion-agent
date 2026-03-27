import type { Command } from 'commander';
import type { CommandDefinition } from '../core/types.js';
import type { NotionClient } from '../core/client.js';
import { printResult, printError } from '../core/output.js';
import { resolveToken } from '../core/config.js';
import { NotionClient as NotionClientImpl } from '../core/client.js';

import { databaseCommands } from './databases/index.js';
import { pageCommands } from './pages/index.js';
import { blockCommands } from './blocks/index.js';
import { userCommands } from './users/index.js';
import { commentCommands } from './comments/index.js';
import { searchCommands } from './search/index.js';
import { workspaceCommands } from './workspace/index.js';

export const ALL_COMMANDS: CommandDefinition[] = [
  ...databaseCommands,
  ...pageCommands,
  ...blockCommands,
  ...userCommands,
  ...commentCommands,
  ...searchCommands,
  ...workspaceCommands,
];

/**
 * Register all CommandDefinitions onto the Commander program.
 * Groups commands by .group, creates a subcommand group for each,
 * then registers each .subcommand under its group.
 */
export function registerAllCommands(program: Command): void {
  const groups = new Map<string, Command>();

  for (const cmd of ALL_COMMANDS) {
    // Create or reuse the group command
    if (!groups.has(cmd.group)) {
      const groupCmd = program
        .command(cmd.group)
        .description(`Notion ${cmd.group} operations`)
        // Show help with exit 0 when called with no subcommand (Friction #3)
        .action(function () { this.help(); });
      groups.set(cmd.group, groupCmd);
    }

    const groupCmd = groups.get(cmd.group)!;
    const sub = groupCmd.command(cmd.subcommand).description(cmd.description);

    // Register options from cliMappings.
    // The primary ID field (first required *_id option) is demoted to optional so that
    // --id can satisfy it — Commander validates requiredOption before the action runs,
    // which would block --id from ever being used. We validate presence manually below.
    let primaryIdField: string | null = null;
    for (const opt of cmd.cliMappings.options ?? []) {
      const isPrimaryId = !primaryIdField && opt.required && opt.field.endsWith('_id');
      if (isPrimaryId) primaryIdField = opt.field;

      if (opt.required && !isPrimaryId) {
        // Non-ID required options stay as requiredOption
        sub.requiredOption(opt.flags, opt.description);
      } else {
        sub.option(opt.flags, opt.description);
      }
    }
    // Add --id as a shorthand alias for the primary ID field (Friction #4)
    if (primaryIdField) {
      const flagName = primaryIdField.replace(/_/g, '-');
      sub.option('--id <id>', `Alias for --${flagName}`);
    }

    // Register positional args from cliMappings
    for (const arg of cmd.cliMappings.args ?? []) {
      if (arg.required) {
        sub.argument(`<${arg.name}>`, arg.description);
      } else {
        sub.argument(`[${arg.name}]`, arg.description);
      }
    }

    sub.action(async (...actionArgs) => {
      // Last arg is the Command instance; second-to-last is options; rest are positional args
      const cmdInstance: Command = actionArgs[actionArgs.length - 1] as Command;
      const opts = cmdInstance.opts() as Record<string, unknown>;
      const parentOpts = cmdInstance.parent?.parent?.opts() as Record<string, unknown> ?? {};

      // Merge global options (from root program) with local options
      const globalOpts = {
        token: (parentOpts.token ?? opts.token) as string | undefined,
        pretty: (parentOpts.pretty ?? opts.pretty) as boolean | undefined,
        quiet: (parentOpts.quiet ?? opts.quiet) as boolean | undefined,
        fields: (parentOpts.fields ?? opts.fields) as string | undefined,
        flat: (parentOpts.flat ?? opts.flat) as boolean | undefined,
      };

      // Build input from options (convert camelCase Commander output → snake_case for schema)
      const input: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(opts)) {
        // Commander converts --my-flag to myFlag; convert back to my_flag for Zod
        const snakeKey = k.replace(/([A-Z])/g, '_$1').toLowerCase();
        input[snakeKey] = v;
        input[k] = v; // also keep camelCase in case schema uses it
      }
      // Map --id alias → primary ID field (must happen before validation)
      if (opts.id && primaryIdField) {
        input[primaryIdField] = opts.id;
      }

      // Validate primary ID field is present (replaces Commander's requiredOption check)
      if (primaryIdField && !input[primaryIdField]) {
        const flagName = primaryIdField.replace(/_/g, '-');
        console.error(JSON.stringify({ error: `Missing required option: --${flagName} (or --id)` }));
        process.exit(1);
      }

      // Handle positional args (all actionArgs except last two are positional)
      const positionalArgs = actionArgs.slice(0, -1);
      for (let i = 0; i < (cmd.cliMappings.args ?? []).length; i++) {
        const argDef = cmd.cliMappings.args![i];
        input[argDef.field] = positionalArgs[i];
      }

      try {
        const token = resolveToken(globalOpts.token);
        const client: NotionClient = new NotionClientImpl(token);
        const result = await cmd.handler(input, client);
        printResult(result, globalOpts);
      } catch (err) {
        printError(err);
        process.exit(1);
      }
    });
  }
}
