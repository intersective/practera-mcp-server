import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerCreateActivityTool(server: McpServer) {
  server.tool(
    'create_activity',
    'Create an activity inside a milestone. Requires admin or coordinator role.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      milestoneId: z.number().describe('ID of the parent milestone.'),
      name: z.string().describe('Activity name.'),
      description: z.string().optional(),
      instructions: z.string().optional().describe('Rich HTML instructions for learners.'),
      visibility: z.number().optional().describe('Visibility bitmask (default 7 = all).'),
      order: z.number().optional(),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({ apikey: params.apikey, email: params.email, region: params.region });
        const mutation = `
          mutation CreateActivity($input: CreateActivityInput!) {
            createActivity(input: $input) {
              id
              name
            }
          }
        `;
        const data: any = await client.request(mutation, {
          input: {
            milestoneId: params.milestoneId,
            name: params.name,
            description: params.description,
            instructions: params.instructions,
            visibility: params.visibility,
            order: params.order,
          },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.createActivity, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
