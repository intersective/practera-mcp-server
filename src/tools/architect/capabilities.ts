import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { designStateService } from '../../engine/state/design-state-service.js';
import { v4 as uuidv4 } from 'uuid';

export function registerCapabilitiesTools(server: McpServer) {
  server.tool(
    'resolve_capabilities',
    'Use this when you have a design brief and want to decompose the desired outcome into concrete, observable capabilities that learners will develop. Returns a structured capability list with suggested learning outcomes.',
    {
      designId: z.string().uuid().describe('The design ID'),
      capabilities: z.array(z.object({
        name: z.string().describe('Short capability name'),
        description: z.string().describe('What a learner who has this capability can do'),
        currentLevel: z.string().optional().describe('Where learners typically start'),
        targetLevel: z.string().optional().describe('Where they should reach by end'),
      })).describe('The capabilities to add to this design'),
      outcomes: z.array(z.object({
        text: z.string().describe('Learning outcome using "Learners will be able to…" language'),
        level: z.string().optional().describe("Bloom's taxonomy level: remember, understand, apply, analyze, evaluate, create"),
      })).describe('Measurable learning outcomes aligned to the capabilities'),
    },
    async (params) => {
      try {
        let design = await designStateService.get(params.designId);
        if (!design) {
          return { content: [{ type: 'text' as const, text: `Design not found: ${params.designId}` }], isError: true };
        }

        // Add capabilities
        for (const cap of params.capabilities) {
          design = await designStateService.addCapability(design.id, { ...cap });
        }

        // Add outcomes
        for (const outcome of params.outcomes) {
          design = await designStateService.addOutcome(design.id, {
            ...outcome,
            evidenceIds: [],
          });
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: design.id,
              version: design.version,
              capabilities: design.capabilities,
              outcomes: design.outcomes,
              message: `Added ${params.capabilities.length} capabilities and ${params.outcomes.length} outcomes.`,
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  server.tool(
    'set_authentic_challenge',
    'Define the authentic challenge — the real-world scenario and goal that gives the entire experience its purpose. This is the core motivating context learners encounter in the "Brief" phase.',
    {
      designId: z.string().uuid(),
      title: z.string().describe('Brief title of the challenge (e.g. "Design and release a playable game for a specified audience")'),
      scenario: z.string().describe('Rich description of the authentic context, audience, and goal — what would a real practitioner face?'),
      audience: z.string().describe('Who the learner is creating for (end user, client, or community)'),
      constraints: z.array(z.string()).describe('Real constraints learners must work within (time, resources, audience needs, technical limits)'),
      successCriteria: z.array(z.string()).describe('Observable, concrete signs that the challenge has been met'),
    },
    async (params) => {
      try {
        const { designId, ...challenge } = params;
        const design = await designStateService.setChallenge(designId, challenge);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ designId: design.id, version: design.version, challenge: design.challenge }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  void uuidv4; // imported but used via service
}
