import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerBriefTools } from './brief.js';
import { registerCapabilitiesTools } from './capabilities.js';
import { registerArchitectureTools } from './architecture.js';
import { registerDesignOpsTools } from './design-ops.js';
import { registerAnalysisTools } from './analysis.js';
import { registerCompileTools } from './compile.js';
import { registerRenderTools } from './render.js';

/**
 * Register all Experiential Learning Architect tools with the MCP server.
 *
 * Tool groups:
 *   Brief / state:   create_design_brief, update_design_brief, list_designs, get_design
 *   Capabilities:    resolve_capabilities, set_authentic_challenge
 *   Architecture:    design_experience_architecture
 *   Design ops:      design_milestone, design_activity, design_artifact, design_assessment,
 *                    design_peer_review_cycle, generate_rubric, adjust_scaffolding, add_curveball
 *   Analysis:        validate_alignment, estimate_workload, score_experience_quality
 *   Practera:        compile_to_practera, validate_practera_package, export_practera_json
 *   Render:          render_experience_map, render_alignment_matrix, render_quality_report
 */
export function registerArchitectTools(server: McpServer) {
  registerBriefTools(server);
  registerCapabilitiesTools(server);
  registerArchitectureTools(server);
  registerDesignOpsTools(server);
  registerAnalysisTools(server);
  registerCompileTools(server);
  registerRenderTools(server);
}
