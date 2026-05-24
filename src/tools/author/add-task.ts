import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerAddTaskTool(server: McpServer) {
  server.tool(
    'add_task_to_activity',
    'Add a task (assessment or topic) to an activity sequence. Requires admin or coordinator role.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      activityId: z.number().describe('ID of the activity.'),
      model: z.enum(['Assess.Assessment', 'Story.Topic']).describe('Type of task to add.'),
      modelId: z.number().describe('ID of the assessment or topic.'),
      order: z.number().optional().describe('Position in the sequence.'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({ apikey: params.apikey, email: params.email, region: params.region });
        const mutation = `
          mutation AddTaskToActivity($input: AddTaskInput!) {
            addTaskToActivity(input: $input) {
              success
              message
            }
          }
        `;
        const data: any = await client.request(mutation, {
          input: { activityId: params.activityId, model: params.model, modelId: params.modelId, order: params.order },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.addTaskToActivity, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
