import { Command } from 'commander';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { registerAllCommands } from './commands/index.js';
import { saveConfig, resolveToken } from './core/config.js';
import { NotionClient } from './core/client.js';
import { printResult } from './core/output.js';

// Read version from package.json
let version = '0.1.0';
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')) as { version: string };
  version = pkg.version;
} catch {
  // fallback
}

const program = new Command();

program
  .name('notion')
  .description('Agent-native CLI + MCP server for the Notion API')
  .version(version)
  .option('--token <token>', 'Notion integration token (overrides NOTION_TOKEN env var)')
  .option('--pretty', 'Pretty-print JSON output')
  .option('--quiet', 'Suppress output (exit code only)')
  .option('--fields <fields>', 'Comma-separated fields to include in output')
  .option('--flat', 'Flatten page property values to human-readable scalars');

// ─── workspace login (interactive setup) ────────────────────────────────────
program
  .command('login')
  .description('Save your Notion integration token to ~/.notion-cli/config.json')
  .option('--token <token>', 'Token to save (or set NOTION_TOKEN env var)')
  .action(async (opts: { token?: string }) => {
    const token = opts.token ?? process.env.NOTION_TOKEN;
    if (!token) {
      console.error('Usage: notion login --token secret_xxxx');
      console.error('Or set NOTION_TOKEN environment variable');
      process.exit(1);
    }
    // Verify the token works
    try {
      const client = new NotionClient(token);
      const me = await client.users.me({});
      saveConfig({ token });
      const workspaceName = (me as Record<string, unknown>).bot
        ? (((me as Record<string, unknown>).bot as Record<string, unknown>).workspace_name as string)
        : 'unknown';
      console.log(JSON.stringify({ authenticated: true, workspace: workspaceName, bot: me.name }));
    } catch {
      console.error(JSON.stringify({ error: 'Invalid token — authentication failed' }));
      process.exit(1);
    }
  });

// Register all command groups (databases, pages, blocks, users, comments, search, workspace)
registerAllCommands(program);

program.parse(process.argv);
