import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerMailTools } from '@aegismail/mcp';

export async function startMcpServer(): Promise<Server> {
  const server = new Server(
    { name: 'aegismail-mcp', version: '0.0.0' },
    { capabilities: { tools: {} } },
  );

  registerMailTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
