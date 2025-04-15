import { z } from 'zod';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createGraphQLClient } from '../libs/graphql-client.js';

// Define types for tool results
export type ToolResult = {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
};

/**
 * Register project query tool with MCP server
 */
export function registerGetProjectTool(server: McpServer) {
  server.tool(
    'mcp_practera_get_project',
    'Get details about a Practera project',
    {
      apikey: z.string().optional().describe('API key for Practera authentication'),
      region: z.string().optional().describe('Practera region (usa, aus, euk, or stage)'),
    },
    async (params: { apikey?: string, region?: string }): Promise<ToolResult> => {
      try {
        const region = params.region || 'usa';
        // Create auth config
        const authConfig = { apikey: params.apikey || '' };
        const client = createGraphQLClient(authConfig, region);
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
        
        const variables = { };
        const data = await client.request(query, variables);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2)
            }
          ]
        } as ToolResult;
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching project: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        } as ToolResult;
      }
    }
  );
} 