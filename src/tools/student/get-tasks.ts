import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerGetTasksTool(server: McpServer) {
  server.tool(
    'get_tasks',
    'Get all tasks (assessments and topics) inside a specific activity.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      activityId: z.number().describe('ID of the activity.'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({ apikey: params.apikey, email: params.email, region: params.region });
        const query = `
          query GetTasks($activityId: Int!) {
            tasks(activityId: $activityId) {
              id
              name
              type
              isLocked
              isTeam
              assessmentType
              contextId
            }
          }
        `;
        const data: any = await client.request(query, { activityId: params.activityId });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.tasks, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
