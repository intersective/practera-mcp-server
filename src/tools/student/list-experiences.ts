import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerListExperiencesTool(server: McpServer) {
  server.tool(
    'list_experiences',
    'List all experiences the authenticated user is enrolled in.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({ apikey: params.apikey, email: params.email, region: params.region });
        const query = `
          query ListExperiences {
            experiences {
              id
              name
              description
              uuid
              status
            }
          }
        `;
        const data: any = await client.request(query);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.experiences, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
