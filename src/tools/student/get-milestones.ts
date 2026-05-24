import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerGetMilestonesTool(server: McpServer) {
  server.tool(
    'get_milestones',
    'Get all milestones and their activities for the current user\'s enrolled project.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({ apikey: params.apikey, email: params.email, region: params.region });
        const query = `
          query GetMilestones {
            project {
              id
              name
              milestones {
                id
                name
                description
                isLocked
                activities {
                  id
                  name
                  description
                  isLocked
                }
              }
            }
          }
        `;
        const data: any = await client.request(query);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.project, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
