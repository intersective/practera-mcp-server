import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerCreateMilestoneTool(server: McpServer) {
  server.tool(
    'create_milestone',
    'Create a milestone (stage) inside a project. Requires admin or coordinator role.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      projectId: z.number().describe('ID of the project to add the milestone to.'),
      name: z.string().describe('Milestone name.'),
      description: z.string().optional(),
      order: z.number().optional().describe('Display order (0-based).'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({ apikey: params.apikey, email: params.email, region: params.region });
        const mutation = `
          mutation CreateMilestone($input: CreateMilestoneInput!) {
            createMilestone(input: $input) {
              id
              name
            }
          }
        `;
        const data: any = await client.request(mutation, {
          input: { projectId: params.projectId, name: params.name, description: params.description, order: params.order },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.createMilestone, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
