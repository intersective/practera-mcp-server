import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerAddQuestionTool(server: McpServer) {
  server.tool(
    'add_question',
    'Add a question to an existing assessment. Requires admin or coordinator role.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      assessmentId: z.number().describe('ID of the assessment to add the question to.'),
      name: z.string().describe('Question text/title.'),
      description: z.string().optional().describe('Optional extra context for the question.'),
      questionType: z.string().optional().describe('Type: text (default), oneof, etc.'),
      isRequired: z.boolean().optional().describe('Whether the question is required.'),
      hasComment: z.boolean().optional().describe('Whether a comment field is shown.'),
      audience: z.string().optional().describe('reviewer (default), submitter, or both.'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({ apikey: params.apikey, email: params.email, region: params.region });
        const mutation = `
          mutation CreateAssessmentQuestion($input: CreateAssessmentQuestionInput!) {
            createAssessmentQuestion(input: $input) {
              id
              name
            }
          }
        `;
        const data: any = await client.request(mutation, {
          input: {
            assessmentId: params.assessmentId,
            name: params.name,
            description: params.description,
            questionType: params.questionType,
            isRequired: params.isRequired,
            hasComment: params.hasComment,
            audience: params.audience,
          },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.createAssessmentQuestion, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
