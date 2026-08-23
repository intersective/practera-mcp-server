import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerSaveReviewAnswerTool(server: McpServer) {
  server.tool(
    'save_review_answer',
    'Save a reviewer\'s answer to a single review question. Call list_pending_reviews to find the reviewId, then save each answer before calling complete_review.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      reviewId: z.number().describe('ID of the review assignment.'),
      questionId: z.number().describe('ID of the review question being answered.'),
      answer: z.string().nullable().optional().describe('Text answer or comment.'),
      choiceId: z.number().optional().describe('Choice ID for rating/scale questions.'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({
          apikey: params.apikey,
          email: params.email,
          region: params.region,
        });
        const mutation = `
          mutation SaveReviewAnswer(
            $reviewId: Int!
            $questionId: Int!
            $answer: String
            $choiceId: Int
          ) {
            saveReviewAnswer(
              reviewId: $reviewId
              questionId: $questionId
              answer: $answer
              choiceId: $choiceId
            ) { id }
          }
        `;
        const data: any = await client.request(mutation, {
          reviewId: params.reviewId,
          questionId: params.questionId,
          answer: params.answer ?? null,
          choiceId: params.choiceId,
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
