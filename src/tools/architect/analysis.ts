import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { designStateService } from '../../engine/state/design-state-service.js';
import { runQualityCheck } from '../../engine/rules/index.js';
import { estimateWorkload } from '../../engine/workload/estimator.js';

export function registerAnalysisTools(server: McpServer) {
  // -------------------------------------------------------------------------
  // validate_alignment
  // -------------------------------------------------------------------------
  server.tool(
    'validate_alignment',
    'Run the pedagogical rules engine against a design. Returns findings by severity (critical, high, medium, info) across all 8 quality dimensions. Always run this before compiling to Practera.',
    {
      designId: z.string().uuid(),
      saveReport: z.boolean().optional().describe('Whether to save the report to the design (default: true)'),
    },
    async (params) => {
      try {
        const design = await designStateService.get(params.designId);
        if (!design) {
          return { content: [{ type: 'text' as const, text: `Design not found: ${params.designId}` }], isError: true };
        }

        const report = runQualityCheck(design);

        if (params.saveReport !== false) {
          await designStateService.setQualityReport(params.designId, report);
        }

        const criticalCount = report.allFindings.filter(f => f.severity === 'critical').length;
        const highCount = report.allFindings.filter(f => f.severity === 'high').length;
        const mediumCount = report.allFindings.filter(f => f.severity === 'medium').length;

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: params.designId,
              overallScore: report.overallScore,
              passesMinimumThreshold: report.passesMinimumThreshold,
              summary: `${report.overallScore}/100 — ${criticalCount} critical, ${highCount} high, ${mediumCount} medium findings`,
              dimensions: report.dimensions.map(d => ({
                dimension: d.dimension,
                score: d.score,
                findingCount: d.findings.length,
                findings: d.findings,
              })),
              allFindings: report.allFindings,
              recommendation: report.passesMinimumThreshold
                ? 'Design passes minimum threshold. Review high/medium findings before compiling.'
                : `BLOCKED: ${criticalCount} critical finding(s) must be resolved before compiling to Practera.`,
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  // -------------------------------------------------------------------------
  // estimate_workload
  // -------------------------------------------------------------------------
  server.tool(
    'estimate_workload',
    'Estimate the learner workload based on activity types, scaffold levels, and duration. Returns per-milestone breakdown and comparison to the budget.',
    {
      designId: z.string().uuid(),
    },
    async (params) => {
      try {
        const design = await designStateService.get(params.designId);
        if (!design) {
          return { content: [{ type: 'text' as const, text: `Design not found: ${params.designId}` }], isError: true };
        }

        const estimate = estimateWorkload(design);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: params.designId,
              ...estimate,
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  // -------------------------------------------------------------------------
  // score_experience_quality
  // -------------------------------------------------------------------------
  server.tool(
    'score_experience_quality',
    'Generate a comprehensive quality scorecard across the 8 design dimensions: Authenticity, Alignment, Scaffolding, Activity, Feedback, Iteration, Social Learning, and Feasibility. Returns a human-readable design report.',
    {
      designId: z.string().uuid(),
    },
    async (params) => {
      try {
        const design = await designStateService.get(params.designId);
        if (!design) {
          return { content: [{ type: 'text' as const, text: `Design not found: ${params.designId}` }], isError: true };
        }

        const report = runQualityCheck(design);
        const workload = estimateWorkload(design);

        await designStateService.setQualityReport(params.designId, report);

        const dimensionSummary = report.dimensions.map(d => {
          const grade = d.score >= 90 ? 'A' : d.score >= 75 ? 'B' : d.score >= 60 ? 'C' : d.score >= 40 ? 'D' : 'F';
          return `${grade} (${d.score}/100) — ${d.dimension}: ${d.findings.length === 0 ? 'No issues' : d.findings.map(f => `[${f.severity.toUpperCase()}] ${f.message}`).join('; ')}`;
        });

        const blockers = report.allFindings.filter(f => f.severity === 'critical');
        const highPriority = report.allFindings.filter(f => f.severity === 'high');

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: params.designId,
              concept: design.brief.concept,
              overallScore: report.overallScore,
              grade: report.overallScore >= 90 ? 'A' : report.overallScore >= 75 ? 'B' : report.overallScore >= 60 ? 'C' : report.overallScore >= 40 ? 'D' : 'F',
              passesMinimumThreshold: report.passesMinimumThreshold,
              workloadSummary: workload.summary,
              dimensionScores: dimensionSummary,
              blockers: blockers.map(f => ({ message: f.message, suggestion: f.suggestion })),
              highPriorityFindings: highPriority.map(f => ({ message: f.message, suggestion: f.suggestion })),
              strengths: report.dimensions
                .filter(d => d.score >= 85 && d.findings.length === 0)
                .map(d => d.dimension),
              nextSteps: blockers.length > 0
                ? 'Resolve critical findings before compiling. Use validate_alignment for detail.'
                : highPriority.length > 0
                  ? 'Address high-priority findings to improve quality, then compile.'
                  : 'Design is ready for compilation. Use compile_to_practera.',
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
