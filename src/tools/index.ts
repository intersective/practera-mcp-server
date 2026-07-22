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

// CLI shims (thin wrappers over practera-ops and practera-dev CLIs)
import { registerOpsShimTool, registerDevShimTool } from './ops-shim.js';

// Experiential Learning Architect
import { registerArchitectTools } from './architect/index.js';

export type { ToolResult } from './get-project.js';

/**
 * Register all tools with the MCP server
 */
export function registerAllTools(server: McpServer) {
  // Generic / read tools
  registerGetProjectTool(server);
  registerGetAssessmentTool(server);
  registerSearchProjectBriefsTool(server);

  // Author tools (designer persona)
  registerCreateExperienceTool(server);
  registerCreateMilestoneTool(server);
  registerCreateActivityTool(server);
  registerCreateAssessmentTool(server);
  registerAddQuestionTool(server);
  registerAddTaskTool(server);
  registerEnrollUserTool(server);
  registerImportExperienceTool(server);
  registerExportExperienceTool(server);

  // Learner/QA-sim tools (student + reviewer personas)
  // Decision (G5): these 7 tools don't map to the 4 primary CLI personas but are
  // retained as a learner-simulation / QA group. They are useful for:
  //   - Integration-testing learner flows without a real browser session
  //   - AI-driven QA simulations (submit assessment, check feedback, submit review)
  //   - Future learner-facing MCP surface if a student persona is added
  // NOT folded into practera-dev because they operate on live GraphQL data, not
  // local tooling. NOT dropped because they have no CLI equivalent yet.
  registerListExperiencesTool(server);
  registerGetMilestonesTool(server);
  registerGetTasksTool(server);
  registerSubmitAssessmentTool(server);
  registerGetFeedbackTool(server);
  registerListPendingReviewsTool(server);
  registerSubmitReviewTool(server);

  // Testing tools (developer persona — shells to practera-test-suite)
  registerRunTestsTool(server);

  // CLI shims — thin wrappers over practera-ops (ops persona) and practera-dev (developer)
  // These enable compound commands (scaffold-experience, pm report, etc.) before
  // each command gets a dedicated tool.
  registerOpsShimTool(server);
  registerDevShimTool(server);

  // Experiential Learning Architect — design state, rules engine, compiler, render tools
  registerArchitectTools(server);
}