import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerSubmitAssessmentTool(server: McpServer) {
  server.tool(
    'submit_assessment',
    'Submit an assessment (finalise all saved answers). Requires a valid learner JWT.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      assessmentId: z.number().describe('ID of the assessment to submit.'),
      contextId: z.number().describe('Context ID linking the assessment to the activity.'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({ apikey: params.apikey, email: params.email, region: params.region });
        const mutation = `
          mutation SubmitAssessment($assessmentId: Int!, $contextId: Int!) {
            submitAssessment(assessmentId: $assessmentId, contextId: $contextId) {
              success
            }
          }
        `;
        const data: any = await client.request(mutation, {
          assessmentId: params.assessmentId,
          contextId: params.contextId,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.submitAssessment, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
