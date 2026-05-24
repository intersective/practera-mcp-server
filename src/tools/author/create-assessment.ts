import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerCreateAssessmentTool(server: McpServer) {
  server.tool(
    'create_assessment',
    'Create an assessment inside an experience. Requires admin or coordinator role.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      name: z.string().describe('Assessment name.'),
      description: z.string().optional(),
      type: z.string().optional().describe('Assessment type: moderated (default), self, etc.'),
      isTeam: z.boolean().optional().describe('Whether this is a team assessment.'),
      experienceId: z.number().describe('Experience ID.'),
      programId: z.number().describe('Program ID.'),
      visibility: z.number().optional(),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({ apikey: params.apikey, email: params.email, region: params.region });
        const mutation = `
          mutation CreateAssessment($input: CreateAssessmentInput!) {
            createAssessment(input: $input) {
              id
              name
            }
          }
        `;
        const data: any = await client.request(mutation, {
          input: {
            name: params.name,
            description: params.description,
            type: params.type,
            isTeam: params.isTeam,
            experienceId: params.experienceId,
            programId: params.programId,
            visibility: params.visibility,
          },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.createAssessment, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
