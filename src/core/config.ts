import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.notion-cli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

interface Config {
  token?: string;
}

function readConfig(): Config {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as Config;
  } catch {
    return {};
  }
}

export function saveConfig(config: Partial<Config>): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const existing = readConfig();
  writeFileSync(CONFIG_FILE, JSON.stringify({ ...existing, ...config }, null, 2));
}

/**
 * Resolve the Notion integration token from:
 * 1. Explicit --token flag (passed as arg)
 * 2. NOTION_TOKEN environment variable
 * 3. ~/.notion-cli/config.json
 */
export function resolveToken(flagToken?: string): string {
  const token = flagToken || process.env.NOTION_TOKEN || readConfig().token;
  if (!token) {
    console.error(
      'Error: No Notion token found.\n' +
        'Set NOTION_TOKEN env var, use --token flag, or run: notion workspace login'
    );
    process.exit(1);
  }
  return token;
}
