import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { designStateService } from '../../engine/state/design-state-service.js';
import { runQualityCheck } from '../../engine/rules/index.js';
import { estimateWorkload } from '../../engine/workload/estimator.js';
import { BUILD_LOOP_PHASE_LABELS } from '../../engine/schema/build-loop.js';

/**
 * Render tools return structured data that the ChatGPT Apps SDK widget can
 * consume via the MCP Apps bridge (ui/notifications/tool-result).
 *
 * The _meta field carries widget-specific rendering hints without polluting
 * the model's reasoning context.
 */

export function registerRenderTools(server: McpServer) {
  // -------------------------------------------------------------------------
  // render_experience_map
  // -------------------------------------------------------------------------
  server.tool(
    'render_experience_map',
    'Use this when the educator wants to see a visual overview of the experience. Returns structured data for the experience map widget showing the BUILD loop sequence, milestones, scaffold levels, and estimated durations.',
    {
      designId: z.string().uuid(),
    },
    async (params) => {
      try {
        const design = await designStateService.get(params.designId);
        if (!design) {
          return { content: [{ type: 'text' as const, text: `Design not found: ${params.designId}` }], isError: true };
        }

        const workload = estimateWorkload(design);
        const sortedMilestones = [...design.milestones].sort((a, b) => a.order - b.order);

        const nodes = sortedMilestones.map(ms => {
          const msActivities = design.activities
            .filter(a => a.milestoneId === ms.id)
            .sort((a, b) => a.order - b.order);

          const msWorkload = workload.milestones.find(m => m.milestoneId === ms.id);

          return {
            id: ms.id,
            name: ms.name,
            description: ms.description,
            buildLoopPhase: ms.buildLoopPhase,
            buildLoopLabel: BUILD_LOOP_PHASE_LABELS[ms.buildLoopPhase],
            order: ms.order,
            estimatedHours: msWorkload?.totalHoursMid,
            activities: msActivities.map(act => ({
              id: act.id,
              name: act.name,
              buildLoopPhase: act.buildLoopPhase,
              buildLoopLabel: BUILD_LOOP_PHASE_LABELS[act.buildLoopPhase],
              scaffoldLevel: act.scaffoldLevel,
              kind: act.kind,
              isTeam: act.isTeam,
              feedbackSource: act.feedbackSource,
              estimatedMinutesMid: workload.milestones
                .find(m => m.milestoneId === ms.id)
                ?.activities.find(a => a.activityId === act.id)
                ?.estimatedMinutesMid,
              artifactCount: act.artifactIds.length,
              assessmentCount: act.assessmentIds.length,
              prerequisiteCount: act.prerequisiteActivityIds.length,
              hasCurveball: !!act.curveballId,
            })),
          };
        });

        const mapData = {
          designId: params.designId,
          concept: design.brief.concept,
          audience: design.brief.audience,
          durationHours: design.brief.durationHours,
          teamSize: design.brief.teamSize ?? 1,
          totalEstimatedHours: workload.totalHoursMid,
          utilizationPercent: workload.utilizationPercent,
          workloadStatus: workload.status,
          nodes,
          challenge: design.challenge ? {
            title: design.challenge.title,
            constraints: design.challenge.constraints,
            successCriteria: design.challenge.successCriteria,
          } : null,
          outcomes: design.outcomes.map(o => ({ id: o.id, text: o.text, level: o.level })),
          view: 'experience_map',
        };

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(mapData, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  // -------------------------------------------------------------------------
  // render_alignment_matrix
  // -------------------------------------------------------------------------
  server.tool(
    'render_alignment_matrix',
    'Use this when the educator wants to check that learning outcomes are covered by activities and assessments. Returns the outcome-evidence alignment matrix showing gaps.',
    {
      designId: z.string().uuid(),
    },
    async (params) => {
      try {
        const design = await designStateService.get(params.designId);
        if (!design) {
          return { content: [{ type: 'text' as const, text: `Design not found: ${params.designId}` }], isError: true };
        }

        const sortedActivities = [...design.activities].sort((a, b) => {
          const mA = design.milestones.find(m => m.id === a.milestoneId)?.order ?? 0;
          const mB = design.milestones.find(m => m.id === b.milestoneId)?.order ?? 0;
          if (mA !== mB) return mA - mB;
          return a.order - b.order;
        });

        // Build matrix: rows = outcomes, columns = activities + assessments
        const columns = [
          ...sortedActivities.map(a => ({
            id: a.id,
            type: 'activity' as const,
            name: a.name,
            milestoneId: a.milestoneId,
            milestoneName: design.milestones.find(m => m.id === a.milestoneId)?.name ?? '',
          })),
          ...design.assessments.map(a => ({
            id: a.id,
            type: 'assessment' as const,
            name: a.name,
            milestoneId: '',
            milestoneName: '',
          })),
        ];

        const rows = design.outcomes.map(outcome => {
          const cells = columns.map(col => {
            if (col.type === 'activity') {
              const activity = design.activities.find(a => a.id === col.id)!;
              const artifactsEvidencing = design.artifacts
                .filter(art => art.outcomeIds.includes(outcome.id) && activity.artifactIds.includes(art.id));
              const aligned = artifactsEvidencing.length > 0;
              return { columnId: col.id, aligned, evidence: artifactsEvidencing.map(a => a.name) };
            } else {
              const assessment = design.assessments.find(a => a.id === col.id)!;
              const aligned = assessment.outcomeIds.includes(outcome.id);
              return { columnId: col.id, aligned, evidence: aligned ? [assessment.name] : [] };
            }
          });

          const alignedCount = cells.filter(c => c.aligned).length;

          return {
            outcomeId: outcome.id,
            outcomeText: outcome.text,
            level: outcome.level,
            cells,
            alignedCount,
            hasGap: alignedCount === 0,
          };
        });

        const gapCount = rows.filter(r => r.hasGap).length;

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: params.designId,
              rows,
              columns,
              outcomeCount: design.outcomes.length,
              gapCount,
              status: gapCount === 0 ? 'fully_aligned' : `${gapCount} outcome(s) have no evidence`,
              view: 'alignment_matrix',
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  // -------------------------------------------------------------------------
  // render_quality_report
  // -------------------------------------------------------------------------
  server.tool(
    'render_quality_report',
    'Use this when the educator wants to see the quality scorecard in a visual format. Returns the full 8-dimension quality report with findings, severity indicators, and suggestions.',
    {
      designId: z.string().uuid(),
    },
    async (params) => {
      try {
        const design = await designStateService.get(params.designId);
        if (!design) {
          return { content: [{ type: 'text' as const, text: `Design not found: ${params.designId}` }], isError: true };
        }

        const report = design.qualityReport ?? runQualityCheck(design);
        const workload = estimateWorkload(design);

        if (!design.qualityReport) {
          await designStateService.setQualityReport(params.designId, report);
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: params.designId,
              concept: design.brief.concept,
              overallScore: report.overallScore,
              passesMinimumThreshold: report.passesMinimumThreshold,
              generatedAt: report.generatedAt,
              dimensions: report.dimensions.map(d => ({
                dimension: d.dimension,
                score: d.score,
                grade: d.score >= 90 ? 'A' : d.score >= 75 ? 'B' : d.score >= 60 ? 'C' : d.score >= 40 ? 'D' : 'F',
                findings: d.findings,
              })),
              workload: {
                summary: workload.summary,
                status: workload.status,
                totalHoursMid: workload.totalHoursMid,
                budgetHours: workload.budgetHours,
                utilizationPercent: workload.utilizationPercent,
              },
              criticalCount: report.allFindings.filter(f => f.severity === 'critical').length,
              highCount: report.allFindings.filter(f => f.severity === 'high').length,
              mediumCount: report.allFindings.filter(f => f.severity === 'medium').length,
              infoCount: report.allFindings.filter(f => f.severity === 'info').length,
              view: 'quality_report',
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
