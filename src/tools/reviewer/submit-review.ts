import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerSubmitReviewTool(server: McpServer) {
  server.tool(
    'submit_review',
    'Submit a completed review for an assessment submission.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      reviewId: z.number().describe('ID of the review to submit.'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({ apikey: params.apikey, email: params.email, region: params.region });
        const mutation = `
          mutation SubmitReview($reviewId: Int!) {
            submitReview(reviewId: $reviewId) {
              success
            }
          }
        `;
        const data: any = await client.request(mutation, { reviewId: params.reviewId });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.submitReview, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
