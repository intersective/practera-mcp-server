import { registerTool } from '../../libs/register-tool.js';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerSaveSubmissionAnswerTool(server: McpServer) {
  registerTool(server, 
    'save_submission_answer',
    'Save a single answer to an in-progress submission. Call get_or_create_submission first to obtain the submissionId. Call submit_assessment when all answers are saved.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      submissionId: z.number().describe('ID of the in-progress submission.'),
      questionId: z.number().describe('ID of the assessment question being answered.'),
      answer: z.string().nullable().optional().describe('Text answer (for text/file questions).'),
      choiceId: z.number().optional().describe('Choice ID (for oneof/multiple-choice questions).'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({
          apikey: params.apikey,
          email: params.email,
          region: params.region,
        });
        const mutation = `
          mutation SaveSubmissionAnswer(
            $submissionId: Int!
            $questionId: Int!
            $answer: String
            $choiceId: Int
          ) {
            saveSubmissionAnswer(
              submissionId: $submissionId
              questionId: $questionId
              answer: $answer
              choiceId: $choiceId
            ) { id }
          }
        `;
        const data: any = await client.request(mutation, {
          submissionId: params.submissionId,
          questionId: params.questionId,
          answer: params.answer ?? null,
          choiceId: params.choiceId,
        });
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ saved: true, answerId: data?.saveSubmissionAnswer?.id }, null, 2),
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
