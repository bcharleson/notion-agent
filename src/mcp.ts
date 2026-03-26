import { startMcpServer } from './mcp/server.js';

startMcpServer().catch((err) => {
  console.error('MCP server error:', err);
  process.exit(1);
});
