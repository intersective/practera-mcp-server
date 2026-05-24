import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerEnrollUserTool(server: McpServer) {
  server.tool(
    'enroll_user',
    'Enroll a user into an experience with a given role. Requires admin or coordinator role.',
    {
      apikey: z.string().optional(),
      email: z.string().optional().describe('Caller email for devLogin.'),
      region: z.string().optional(),
      userEmail: z.string().describe('Email of the user to enroll.'),
      role: z.enum(['participant', 'mentor', 'coordinator', 'admin']).describe('Role to assign.'),
      experienceUuid: z.string().describe('UUID of the target experience.'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({ apikey: params.apikey, email: params.email, region: params.region });
        const mutation = `
          mutation EnrollUser($input: EnrollUserInput!) {
            enrollUser(input: $input) {
              success
              message
            }
          }
        `;
        const data: any = await client.request(mutation, {
          input: { email: params.userEmail, role: params.role, experienceUuid: params.experienceUuid },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.enrollUser, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
