import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetProjectTool } from './get-project.js';
import { registerGetAssessmentTool } from './get-assessment.js';
import { registerSearchProjectBriefsTool } from './search-project-briefs.js';

export type { ToolResult } from './get-project.js';

/**
 * Register all tools with the MCP server
 */
export function registerAllTools(server: McpServer) {
  registerGetProjectTool(server);
  registerGetAssessmentTool(server);
  registerSearchProjectBriefsTool(server);
  
  // Add more tools here as needed
} 