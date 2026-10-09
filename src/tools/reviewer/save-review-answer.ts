import { registerTool } from '../../libs/register-tool.js';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerSaveReviewAnswerTool(server: McpServer) {
  registerTool(server, 
    'save_review_answer',
    'Save a reviewer\'s answer to a single review question. Call list_pending_reviews to find the reviewId, then save each answer before calling complete_review.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      reviewId: z.number().describe('ID of the review assignment.'),
      submissionId: z.number().optional().describe('ID of the submission being reviewed (required when creating an answer for the first time).'),
      questionId: z.number().describe('ID of the review question being answered.'),
      answer: z.string().nullable().optional().describe('Text answer or comment.'),
      comment: z.string().optional().describe('Reviewer comment for this answer.'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({
          apikey: params.apikey,
          email: params.email,
          region: params.region,
        });
        const mutation = `
          mutation SaveReviewAnswer($input: SaveReviewAnswerInput!) {
            saveReviewAnswer(input: $input) { success message }
          }
        `;
        const data: any = await client.request(mutation, {
          input: {
            reviewId: params.reviewId,
            submissionId: params.submissionId,
            questionId: params.questionId,
            answer: params.answer ?? null,
            comment: params.comment,
          },
        });
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ saved: true, answerId: data?.saveReviewAnswer?.id }, null, 2),
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
