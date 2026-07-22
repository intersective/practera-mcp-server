import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { designStateService } from '../../engine/state/design-state-service.js';
import { DesignBriefSchema } from '../../engine/schema/experience-design.js';

export function registerBriefTools(server: McpServer) {
  // -------------------------------------------------------------------------
  // create_design_brief
  // -------------------------------------------------------------------------
  server.tool(
    'create_design_brief',
    'Use this when an educator provides initial information about a learning program they want to design. Creates a new ExperienceDesign from a brief description of the concept, audience, duration, and desired outcome. Returns a designId for all subsequent operations.',
    {
      concept: z.string().describe('The core concept or capability to be developed (e.g. "AI-assisted game development in Godot")'),
      audience: z.string().describe('Who the learners are (e.g. "University students in their second year of computer science")'),
      startingLevel: z.string().describe('Where learners are now (e.g. "No prior game development experience, some Python")'),
      durationHours: z.number().describe('Total available time in hours'),
      desiredOutcome: z.string().describe('The transformation you want to produce — what should learners be able to do after?'),
      teamSize: z.number().optional().describe('Individual (1) or team size (2-6). Default: 1'),
      deliveryMode: z.enum(['async', 'sync', 'blended']).optional().describe('Delivery mode. Default: async'),
      availableTools: z.array(z.string()).optional().describe('Tools learners will have access to'),
      constraints: z.array(z.string()).optional().describe('Constraints for the design (e.g. "must be deployable, no LMS integration")'),
      academicLevel: z.string().optional().describe('Academic level if relevant (e.g. "second year undergraduate")'),
      sourceMaterial: z.string().optional().describe('Existing content or resources to incorporate'),
      pedagogicalFramework: z.string().optional().describe('Preferred pedagogical approach if any'),
    },
    async (params) => {
      try {
        const brief = DesignBriefSchema.parse({
          concept: params.concept,
          audience: params.audience,
          startingLevel: params.startingLevel,
          durationHours: params.durationHours,
          desiredOutcome: params.desiredOutcome,
          teamSize: params.teamSize,
          deliveryMode: params.deliveryMode,
          availableTools: params.availableTools,
          constraints: params.constraints,
          academicLevel: params.academicLevel,
          sourceMaterial: params.sourceMaterial,
          pedagogicalFramework: params.pedagogicalFramework,
        });
        const design = await designStateService.create(brief);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: design.id,
              version: design.version,
              brief: design.brief,
              message: `Design created. Use designId "${design.id}" in all subsequent architect tool calls.`,
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  // -------------------------------------------------------------------------
  // update_design_brief
  // -------------------------------------------------------------------------
  server.tool(
    'update_design_brief',
    'Update the brief for an existing design. Use when the educator wants to change the concept, audience, duration, constraints or other top-level parameters.',
    {
      designId: z.string().uuid().describe('The design ID returned by create_design_brief'),
      concept: z.string().optional(),
      audience: z.string().optional(),
      startingLevel: z.string().optional(),
      targetLevel: z.string().optional(),
      durationHours: z.number().optional(),
      desiredOutcome: z.string().optional(),
      teamSize: z.number().optional(),
      deliveryMode: z.enum(['async', 'sync', 'blended']).optional(),
      availableTools: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional(),
      accessToExperts: z.boolean().optional(),
      cohortSize: z.number().optional(),
      academicLevel: z.string().optional(),
      sourceMaterial: z.string().optional(),
      pedagogicalFramework: z.string().optional(),
    },
    async (params) => {
      try {
        const { designId, ...updates } = params;
        const filtered = Object.fromEntries(
          Object.entries(updates).filter(([, v]) => v !== undefined)
        );
        const design = await designStateService.updateBrief(designId, filtered);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ designId: design.id, version: design.version, brief: design.brief }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  // -------------------------------------------------------------------------
  // list_designs
  // -------------------------------------------------------------------------
  server.tool(
    'list_designs',
    'List all experience designs in the current session. Returns design IDs, concepts, versions, and last-modified timestamps.',
    {},
    async () => {
      try {
        const designs = await designStateService.list();
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(designs.length === 0
              ? { message: 'No designs found. Use create_design_brief to start.', designs: [] }
              : { count: designs.length, designs },
            null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  // -------------------------------------------------------------------------
  // get_design
  // -------------------------------------------------------------------------
  server.tool(
    'get_design',
    'Retrieve the full current state of an experience design. Use to inspect or summarize the design before running validation or compilation.',
    {
      designId: z.string().uuid().describe('The design ID'),
      version: z.number().optional().describe('Specific version to retrieve. Omit for current version.'),
    },
    async (params) => {
      try {
        const design = params.version
          ? await designStateService.getVersion(params.designId, params.version)
          : await designStateService.get(params.designId);

        if (!design) {
          return { content: [{ type: 'text' as const, text: `Design not found: ${params.designId}` }], isError: true };
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: design.id,
              version: design.version,
              updatedAt: design.updatedAt,
              brief: design.brief,
              outcomes: design.outcomes,
              capabilities: design.capabilities,
              challenge: design.challenge,
              milestones: design.milestones.length,
              activities: design.activities.length,
              artifacts: design.artifacts.length,
              assessments: design.assessments.length,
              rubrics: design.rubrics.length,
              reviewCycles: design.reviewCycles.length,
              hasQualityReport: !!design.qualityReport,
              hasPracteraMapping: !!design.practeraMapping,
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
