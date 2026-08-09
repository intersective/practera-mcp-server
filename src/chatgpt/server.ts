import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerChatGptPublicTools } from './public-tools.js';

export function createChatGptServer(): McpServer {
  const server = new McpServer(
    {
      name: 'practera-project-briefs',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions:
        'Help users discover authentic experiential learning project briefs. Call search first. Call fetch for full detail. Use render_project_briefs when a visual comparison would help.',
    }
  );

  registerChatGptPublicTools(server);
  return server;
}
