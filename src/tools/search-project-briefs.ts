import { z } from 'zod';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { projectBriefService } from '../libs/project-brief-service.js';
import { ToolResult } from './get-project.js';

/**
 * Register project brief search tool with MCP server
 */
export function registerSearchProjectBriefsTool(server: McpServer) {
  server.tool(
    'mcp_practera_search_project_briefs',
    'Search for project briefs that match a specific skill',
    {
      skill: z.string().describe('The skill to search for in project briefs'),
      limit: z.number().min(1).max(20).optional().describe('Maximum number of results to return (default: 5)')
    },
    async (params: { skill: string, limit?: number }): Promise<ToolResult> => {
      try {
        const limit = params.limit || 5;
        const results = await projectBriefService.searchBySkill(params.skill, limit);
        
        if (results.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No project briefs found matching the skill "${params.skill}".`
              }
            ]
          };
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error searching project briefs: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
} 