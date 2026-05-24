import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerListPendingReviewsTool(server: McpServer) {
  server.tool(
    'list_pending_reviews',
    'List all assessment submissions pending review for the authenticated reviewer.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({ apikey: params.apikey, email: params.email, region: params.region });
        const query = `
          query ListPendingReviews {
            reviews(status: "pending") {
              id
              status
              submission {
                id
                assessment {
                  id
                  name
                }
                user {
                  name
                  email
                }
              }
            }
          }
        `;
        const data: any = await client.request(query);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.reviews, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
