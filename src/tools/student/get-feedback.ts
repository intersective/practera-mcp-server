import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerGetFeedbackTool(server: McpServer) {
  server.tool(
    'get_feedback',
    'Get review feedback for a specific assessment submission.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      submissionId: z.number().describe('ID of the assessment submission.'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({ apikey: params.apikey, email: params.email, region: params.region });
        const query = `
          query GetFeedback($submissionId: Int!) {
            submission(id: $submissionId) {
              id
              status
              reviews {
                id
                status
                answers {
                  id
                  answer
                  comment
                  question {
                    name
                  }
                }
              }
            }
          }
        `;
        const data: any = await client.request(query, { submissionId: params.submissionId });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.submission, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
