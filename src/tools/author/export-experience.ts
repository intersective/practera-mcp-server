import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerExportExperienceTool(server: McpServer) {
  server.tool(
    'export_experience',
    'Export an experience as JSON (milestones, activities, assessments, topics). Requires admin or coordinator role.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      experienceId: z.number().describe('ID of the experience to export.'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({ apikey: params.apikey, email: params.email, region: params.region });
        const mutation = `
          mutation ExportExperience($id: Int!) {
            exportExperience(id: $id) {
              experience
            }
          }
        `;
        const data: any = await client.request(mutation, { id: params.experienceId });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.exportExperience, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
