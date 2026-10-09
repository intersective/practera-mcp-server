import { registerTool } from '../../libs/register-tool.js';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerCompleteReviewTool(server: McpServer) {
  registerTool(server, 
    'complete_review',
    'Finalise a review, marking it as done and making feedback visible to the learner. Optionally pass inline answers to save and submit in one step.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      reviewId: z.number().describe('ID of the review to submit.'),
      answers: z
        .array(
          z.object({
            questionId: z.number(),
            answer: z.string().optional(),
            choiceId: z.number().optional(),
          }),
        )
        .optional()
        .describe('Optional: inline answers to save alongside submission.'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({
          apikey: params.apikey,
          email: params.email,
          region: params.region,
        });
        const mutation = `
          mutation CompleteReview($reviewId: Int!, $answers: [ReviewAnswerInput]) {
            submitReview(id: $reviewId, answers: $answers) { id status }
          }
        `;
        const data: any = await client.request(mutation, {
          reviewId: params.reviewId,
          answers: params.answers,
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(data?.submitReview, null, 2) }],
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
