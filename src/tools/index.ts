import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetProjectTool } from './get-project.js';
import { registerGetAssessmentTool } from './get-assessment.js';
import { registerSearchProjectBriefsTool } from './search-project-briefs.js';

// Author tools
import { registerCreateExperienceTool } from './author/create-experience.js';
import { registerCreateMilestoneTool } from './author/create-milestone.js';
import { registerCreateActivityTool } from './author/create-activity.js';
import { registerCreateAssessmentTool } from './author/create-assessment.js';
import { registerAddQuestionTool } from './author/add-question.js';
import { registerAddTaskTool } from './author/add-task.js';
import { registerEnrollUserTool } from './author/enroll-user.js';
import { registerImportExperienceTool } from './author/import-experience.js';
import { registerExportExperienceTool } from './author/export-experience.js';

// Student tools
import { registerListExperiencesTool } from './student/list-experiences.js';
import { registerGetMilestonesTool } from './student/get-milestones.js';
import { registerGetTasksTool } from './student/get-tasks.js';
import { registerSubmitAssessmentTool } from './student/submit-assessment.js';
import { registerGetFeedbackTool } from './student/get-feedback.js';

// Reviewer tools
import { registerListPendingReviewsTool } from './reviewer/list-pending-reviews.js';
import { registerSubmitReviewTool } from './reviewer/submit-review.js';

// Testing tools
import { registerRunTestsTool } from './testing/run-tests.js';

export type { ToolResult } from './get-project.js';

/**
 * Register all tools with the MCP server
 */
export function registerAllTools(server: McpServer) {
  // Existing generic tools
  registerGetProjectTool(server);
  registerGetAssessmentTool(server);
  registerSearchProjectBriefsTool(server);

  // Author tools
  registerCreateExperienceTool(server);
  registerCreateMilestoneTool(server);
  registerCreateActivityTool(server);
  registerCreateAssessmentTool(server);
  registerAddQuestionTool(server);
  registerAddTaskTool(server);
  registerEnrollUserTool(server);
  registerImportExperienceTool(server);
  registerExportExperienceTool(server);

  // Student tools
  registerListExperiencesTool(server);
  registerGetMilestonesTool(server);
  registerGetTasksTool(server);
  registerSubmitAssessmentTool(server);
  registerGetFeedbackTool(server);

  // Reviewer tools
  registerListPendingReviewsTool(server);
  registerSubmitReviewTool(server);

  // Testing tools
  registerRunTestsTool(server);
}