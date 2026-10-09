import { registerTool } from '../../libs/register-tool.js';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerGetOrCreateSubmissionTool(server: McpServer) {
  registerTool(server, 
    'get_or_create_submission',
    'Query an assessment\'s submissions for a given context. The GraphQL API automatically creates a new in-progress submission if none exists. Returns the submissionId needed for save_submission_answer and submit_assessment.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      assessmentId: z.number().describe('ID of the assessment.'),
      contextId: z.number().describe('Context ID linking the assessment to its activity.'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({
          apikey: params.apikey,
          email: params.email,
          region: params.region,
        });
        const query = `
          query GetSubmission($assessmentId: Int!, $contextId: Int!) {
            assessment(id: $assessmentId) {
              submissions(contextId: $contextId) {
                id status answers { id questionId answer choiceId }
              }
            }
          }
        `;
        const data: any = await client.request(query, {
          assessmentId: params.assessmentId,
          contextId: params.contextId,
        });
        const submissions = data?.assessment?.submissions ?? [];
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(
              submissions.length > 0
                ? submissions[0]
                : { error: 'No submission created — check assessmentId and contextId' },
              null,
              2,
            ),
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
