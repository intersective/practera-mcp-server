import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerAssignReviewerTool(server: McpServer) {
  server.tool(
    'assign_reviewer',
    'Assign a reviewer to a submitted assessment. Use reviewerType "expert" for mentors/coordinators or "peer" for fellow learners. Optionally specify a reviewerId to assign a specific person; otherwise the system selects automatically.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      submissionId: z.number().describe('ID of the submission to assign a reviewer to.'),
      reviewerType: z.enum(['expert', 'peer']).describe('"expert" for mentor/coordinator reviewers, "peer" for learner reviewers.'),
      reviewerId: z.number().optional().describe('Optional: specific user ID to assign as reviewer. If omitted, auto-assigns.'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({
          apikey: params.apikey,
          email: params.email,
          region: params.region,
        });
        const mutation = `
          mutation AssignReviewer($submissionId: Int!, $reviewerType: String!, $reviewerId: Int) {
            assignReviewer(
              submissionId: $submissionId
              reviewerType: $reviewerType
              reviewerId: $reviewerId
            ) { id status reviewer { id email } }
          }
        `;
        const data: any = await client.request(mutation, {
          submissionId: params.submissionId,
          reviewerType: params.reviewerType,
          reviewerId: params.reviewerId,
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(data?.assignReviewer, null, 2) }],
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
