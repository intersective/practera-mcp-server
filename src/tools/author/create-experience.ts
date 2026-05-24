import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerCreateExperienceTool(server: McpServer) {
  server.tool(
    'create_experience',
    'Create a new experience (program) inside an institution. Requires admin role.',
    {
      apikey: z.string().optional().describe('Practera JWT. Omit in local dev to use devLogin.'),
      email: z.string().optional().describe('Email for devLogin (local/stage only).'),
      region: z.string().optional().describe('Region: usa, aus, euk, stage, local.'),
      name: z.string().describe('Name of the experience.'),
      institutionUuid: z.string().describe('UUID of the institution.'),
      description: z.string().optional().describe('Optional description.'),
      type: z.string().optional().describe('Experience type, e.g. project or self-paced.'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({ apikey: params.apikey, email: params.email, region: params.region });
        const mutation = `
          mutation CreateExperience($input: CreateExperienceInput!) {
            createExperience(input: $input) {
              id
              name
              uuid
            }
          }
        `;
        const data: any = await client.request(mutation, {
          input: {
            name: params.name,
            institutionUuid: params.institutionUuid,
            description: params.description,
            type: params.type,
          },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.createExperience, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
