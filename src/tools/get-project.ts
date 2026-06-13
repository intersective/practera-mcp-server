import { z } from 'zod';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAuthenticatedClient } from '../libs/auth-helper.js';

export type ToolResult = {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
};

/**
 * Register project query tool with MCP server.
 * Supports both apikey (direct) and email/devLogin (local/stage only).
 */
export function registerGetProjectTool(server: McpServer) {
  server.tool(
    'mcp_practera_get_project',
    'Get the full project tree for the authenticated user — milestones, activities, and tasks.',
    {
      apikey: z.string().optional().describe('Practera JWT (apikey). Required for production envs; optional if email is set for local/stage.'),
      email: z.string().optional().describe('Email for devLogin (local/stage only). Omit if apikey is provided.'),
      region: z.string().optional().describe('Practera region: usa | aus | euk | stage | local'),
    },
    async (params: { apikey?: string; email?: string; region?: string }): Promise<ToolResult> => {
      try {
        const client = await createAuthenticatedClient({
          apikey: params.apikey,
          email: params.email,
          region: params.region,
        });

        const query = `
          query project {
            project {
              id
              name
              milestones {
                id
                name
                description
                isLocked
                activities {
                  id
                  name
                  description
                  instructions
                  isLocked
                  leadImage
                  tasks {
                    id
                    name
                    type
                    isLocked
                    isTeam
                    deadline
                    contextId
                    assessmentType
                  }
                }
              }
            }
          }
        `;

        const data = await client.request(query);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error fetching project: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );
}
