import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerStartActivityTool(server: McpServer) {
  server.tool(
    'start_activity',
    'Mark an activity as started for the authenticated learner. This creates a progress record so the activity appears as "in progress" on the learner\'s task list.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      activityId: z.number().describe('ID of the activity to start.'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({
          apikey: params.apikey,
          email: params.email,
          region: params.region,
        });
        const mutation = `
          mutation StartActivity($activityId: Int!) {
            startActivity(activityId: $activityId) { id }
          }
        `;
        const data: any = await client.request(mutation, { activityId: params.activityId });
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ started: true, progressId: data?.startActivity?.id }, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    },
  );
}
