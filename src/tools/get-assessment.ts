import { z } from 'zod';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createGraphQLClient } from '../libs/graphql-client.js';
import { ToolResult } from './get-project.js';

/**
 * Register assessment query tool with MCP server
 */
export function registerGetAssessmentTool(server: McpServer) {
  server.tool(
    'mcp_practera_get_assessment',
    'Get details about a Practera assessment. Note that assessmentId is the ID of the task, not the ID of the activity.',
    {
      apikey: z.string().optional().describe('API key for Practera authentication'),
      region: z.string().optional().describe('Practera region (usa, aus, euk, or stage)'),
      assessmentId: z.string().describe('ID of the assessment to fetch')
    },
    async (params: { apikey?: string, region?: string, assessmentId: string }): Promise<ToolResult> => {
      try {
        const region = params.region || 'usa';
        // Create auth config
        const authConfig = { apikey: params.apikey || '' };
        const client = createGraphQLClient(authConfig, region);
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
        
        const variables = { id: parseInt(params.assessmentId)};
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
              text: `Error fetching assessment: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        } as ToolResult;
      }
    }
  );
} 