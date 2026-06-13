import { z } from 'zod';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAuthenticatedClient } from '../libs/auth-helper.js';
import { ToolResult } from './get-project.js';

/**
 * Register assessment query tool with MCP server.
 * Supports both apikey (direct) and email/devLogin (local/stage only).
 */
export function registerGetAssessmentTool(server: McpServer) {
  server.tool(
    'mcp_practera_get_assessment',
    'Get details about a Practera assessment (questions, choices, groups). Note: assessmentId is the task ID, not the activity ID.',
    {
      apikey: z.string().optional().describe('Practera JWT (apikey). Required for production envs; optional if email is set for local/stage.'),
      email: z.string().optional().describe('Email for devLogin (local/stage only). Omit if apikey is provided.'),
      region: z.string().optional().describe('Practera region: usa | aus | euk | stage | local'),
      assessmentId: z.string().describe('Task ID of the assessment to fetch'),
    },
    async (params: { apikey?: string; email?: string; region?: string; assessmentId: string }): Promise<ToolResult> => {
      try {
        const client = await createAuthenticatedClient({
          apikey: params.apikey,
          email: params.email,
          region: params.region,
        });

        const query = `
          query GetAssessment($id: Int!) {
            assessment(id: $id, reviewer: false) {
              id
              name
              description
              type
              dueDate
              isTeam
              pulseCheck
              groups {
                name
                description
                questions {
                  id
                  name
                  description
                  type
                  isRequired
                  hasComment
                  audience
                  fileType
                  choices {
                    id
                    name
                    description
                    explanation
                  }
                }
              }
            }
          }
        `;

        const variables = { id: parseInt(params.assessmentId) };
        const data = await client.request(query, variables);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error fetching assessment: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );
}
