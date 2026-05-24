import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerImportExperienceTool(server: McpServer) {
  server.tool(
    'import_experience',
    'Bulk-import experience content (milestones, activities, assessments) from a JSON export into an existing experience. Requires admin role or local environment.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      experienceUuid: z.string().describe('UUID of the target experience.'),
      data: z.string().describe('Stringified JSON in Practera export format.'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({ apikey: params.apikey, email: params.email, region: params.region });
        const mutation = `
          mutation ImportExperienceData($experienceUuid: String!, $data: String!) {
            importExperienceData(experienceUuid: $experienceUuid, data: $data) {
              experienceUuid
              success
              message
            }
          }
        `;
        const data: any = await client.request(mutation, {
          experienceUuid: params.experienceUuid,
          data: params.data,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.importExperienceData, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
