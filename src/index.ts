import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import { registerAllCommands } from './commands/index.js';
import { saveConfig, resolveToken } from './core/config.js';
import { NotionClient } from './core/client.js';
import { printResult } from './core/output.js';

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

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
    let token = opts.token ?? process.env.NOTION_TOKEN;

    // Interactive prompt when no token provided
    if (!token) {
      process.stderr.write('Paste your Notion integration token (secret_... or ntn_...):\n');
      token = await prompt('Token: ');
    }

    if (!token) {
      console.error('Usage: notion login --token <token>');
      console.error('Tokens start with secret_ or ntn_');
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
      process.stderr.write('\n');
      console.log(JSON.stringify({ authenticated: true, workspace: workspaceName, bot: me.name }));
    } catch {
      console.error(JSON.stringify({ error: 'Invalid token — authentication failed' }));
      process.exit(1);
    }
  });

// Register all command groups (databases, pages, blocks, users, comments, search, workspace)
registerAllCommands(program);

program.parse(process.argv);
