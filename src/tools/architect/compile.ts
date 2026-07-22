import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { designStateService } from '../../engine/state/design-state-service.js';
import { compileDesign, validateIntegrity } from '../../engine/compiler/index.js';
import { runQualityCheck } from '../../engine/rules/index.js';

export function registerCompileTools(server: McpServer) {
  // -------------------------------------------------------------------------
  // compile_to_practera
  // -------------------------------------------------------------------------
  server.tool(
    'compile_to_practera',
    'Compile the experience design into a Practera export package. Runs quality validation first and blocks compilation if critical findings exist. Returns the compiled package stats and the JSON.',
    {
      designId: z.string().uuid(),
      institutionId: z.string().optional().describe('Institution UUID to set on compiled records. Defaults to "default".'),
      forceCompile: z.boolean().optional().describe('Compile even if critical quality findings exist. Not recommended.'),
    },
    async (params) => {
      try {
        const design = await designStateService.get(params.designId);
        if (!design) {
          return { content: [{ type: 'text' as const, text: `Design not found: ${params.designId}` }], isError: true };
        }

        // Quality gate
        const report = runQualityCheck(design);
        const criticals = report.allFindings.filter(f => f.severity === 'critical');

        if (criticals.length > 0 && !params.forceCompile) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                blocked: true,
                reason: `${criticals.length} critical finding(s) must be resolved before compilation.`,
                criticalFindings: criticals.map(f => ({ message: f.message, suggestion: f.suggestion })),
                hint: 'Use validate_alignment for full detail, then fix the issues. Pass forceCompile: true to override (not recommended).',
              }, null, 2),
            }],
            isError: true,
          };
        }

        const result = compileDesign(design, params.institutionId ?? 'default');

        // Store the mapping
        await designStateService.setPracteraMapping(params.designId, {
          experienceUuid: result.package.data.Experience.uuid,
          programUuid: result.package.data.Program.id,
          projectUuid: result.package.data.Project.id,
          milestoneIdMap: Object.fromEntries(
            design.milestones.map(m => [m.id, result.package.data.Milestone.find(pm => pm.name === m.name)?.id ?? ''])
          ),
          activityIdMap: Object.fromEntries(
            design.activities.map(a => [a.id, result.package.data.Activity.find(pa => pa.name === a.name)?.id ?? ''])
          ),
          assessmentIdMap: {},
          topicIdMap: {},
          compiledAt: new Date().toISOString(),
        });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: params.designId,
              stats: result.stats,
              warnings: result.warnings,
              qualityScore: report.overallScore,
              experienceUuid: result.package.data.Experience.uuid,
              package: result.package,
              message: `Compiled successfully. ${result.stats.milestones} milestones, ${result.stats.activities} activities, ${result.stats.assessments} assessments. Use export_practera_json to get the importable JSON string.`,
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  // -------------------------------------------------------------------------
  // validate_practera_package
  // -------------------------------------------------------------------------
  server.tool(
    'validate_practera_package',
    'Validate referential integrity of a compiled Practera package. Checks that all foreign key references are satisfied before import.',
    {
      designId: z.string().uuid(),
      institutionId: z.string().optional(),
    },
    async (params) => {
      try {
        const design = await designStateService.get(params.designId);
        if (!design) {
          return { content: [{ type: 'text' as const, text: `Design not found: ${params.designId}` }], isError: true };
        }

        const result = compileDesign(design, params.institutionId ?? 'default');
        const errors = validateIntegrity(result.package);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              valid: errors.length === 0,
              errorCount: errors.length,
              errors,
              stats: result.stats,
              compilerWarnings: result.warnings,
              message: errors.length === 0
                ? 'Package is valid. Ready to export and import into Practera.'
                : `${errors.length} integrity errors found. These must be resolved before import.`,
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  // -------------------------------------------------------------------------
  // export_practera_json
  // -------------------------------------------------------------------------
  server.tool(
    'export_practera_json',
    'Produce the final importable JSON string for a compiled design. This is the payload to pass to the Practera importExperienceData or importExperienceJson mutation.',
    {
      designId: z.string().uuid(),
      institutionId: z.string().optional(),
      prettyPrint: z.boolean().optional().describe('Format with indentation (default: false for compact export)'),
    },
    async (params) => {
      try {
        const design = await designStateService.get(params.designId);
        if (!design) {
          return { content: [{ type: 'text' as const, text: `Design not found: ${params.designId}` }], isError: true };
        }

        const result = compileDesign(design, params.institutionId ?? 'default');
        const errors = validateIntegrity(result.package);

        if (errors.length > 0) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                valid: false,
                errors,
                hint: 'Run validate_practera_package for details, then fix the design before exporting.',
              }, null, 2),
            }],
            isError: true,
          };
        }

        const json = params.prettyPrint
          ? JSON.stringify(result.package, null, 2)
          : JSON.stringify(result.package);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: params.designId,
              experienceName: result.package.name,
              stats: result.stats,
              jsonLength: json.length,
              json,
              importInstructions: 'Pass the "json" field value to the importExperienceData(experienceUuid, data) mutation, or importExperienceJson(data, institutionId) for a new experience.',
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
