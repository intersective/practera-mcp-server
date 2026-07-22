import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { v4 as uuidv4 } from 'uuid';
import { designStateService } from '../../engine/state/design-state-service.js';

export function registerDesignOpsTools(server: McpServer) {
  // -------------------------------------------------------------------------
  // design_milestone
  // -------------------------------------------------------------------------
  server.tool(
    'design_milestone',
    'Add a new milestone to an existing design, or update an existing one. Use when incrementally building the architecture or making targeted changes.',
    {
      designId: z.string().uuid(),
      milestoneId: z.string().uuid().optional().describe('Provide to update an existing milestone. Omit to add a new one.'),
      name: z.string(),
      description: z.string().optional(),
      buildLoopPhase: z.enum(['brief', 'unpack', 'implement', 'learn', 'develop']),
      order: z.number(),
      durationDays: z.number().optional(),
    },
    async (params) => {
      try {
        let design;
        if (params.milestoneId) {
          design = await designStateService.updateMilestone(params.designId, params.milestoneId, {
            name: params.name,
            description: params.description,
            buildLoopPhase: params.buildLoopPhase,
            order: params.order,
            durationDays: params.durationDays,
          });
        } else {
          design = await designStateService.addMilestone(params.designId, {
            name: params.name,
            description: params.description,
            buildLoopPhase: params.buildLoopPhase,
            durationDays: params.durationDays,
            activityIds: [],
          });
        }
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: design.id,
              version: design.version,
              milestones: design.milestones,
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  // -------------------------------------------------------------------------
  // design_activity
  // -------------------------------------------------------------------------
  server.tool(
    'design_activity',
    'Add or update a single activity within a milestone. Specify the milestone by ID.',
    {
      designId: z.string().uuid(),
      activityId: z.string().uuid().optional().describe('Provide to update. Omit to add new.'),
      milestoneId: z.string().uuid().describe('Parent milestone ID'),
      name: z.string(),
      description: z.string().optional(),
      instructions: z.string().optional(),
      scaffoldLevel: z.enum(['modelled', 'guided', 'supported', 'independent', 'transferred']),
      buildLoopPhase: z.enum(['brief', 'unpack', 'implement', 'learn', 'develop']),
      kind: z.enum(['reading', 'guided_task', 'independent_task', 'peer_review', 'reflection', 'team_coordination', 'presentation', 'research', 'feedback_response', 'assessment']),
      order: z.number(),
      isTeam: z.boolean().optional(),
      feedbackSource: z.enum(['peer', 'expert', 'self', 'automated', 'none']).optional(),
      estimatedMinutes: z.number().optional(),
    },
    async (params) => {
      try {
        let design;
        const { designId, activityId, milestoneId, ...actData } = params;

        if (activityId) {
          design = await designStateService.updateActivity(designId, activityId, actData);
        } else {
          design = await designStateService.addActivity(designId, {
            milestoneId,
            ...actData,
            isTeam: actData.isTeam ?? false,
            artifactIds: [],
            assessmentIds: [],
            prerequisiteActivityIds: [],
          });
        }
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: design.id,
              version: design.version,
              activities: design.activities.filter(a => a.milestoneId === milestoneId),
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  // -------------------------------------------------------------------------
  // design_artifact
  // -------------------------------------------------------------------------
  server.tool(
    'design_artifact',
    'Define a deliverable — a concrete work product that learners will produce. Specify what evidence it must contain, who reviews it, and which learning outcomes it evidences.',
    {
      designId: z.string().uuid(),
      name: z.string(),
      format: z.array(z.string()).describe('Accepted formats, e.g. ["Git repository", "PDF report"]'),
      requiredEvidence: z.array(z.string()).describe('Specific observable evidence the artifact must contain'),
      reviewableBy: z.enum(['peer', 'expert', 'self', 'automated', 'none']),
      revisionRequired: z.boolean().optional(),
      outcomeIds: z.array(z.string()).optional().describe('IDs of learning outcomes this artifact evidences'),
      activityIds: z.array(z.string()).optional().describe('IDs of activities that produce this artifact'),
    },
    async (params) => {
      try {
        const { designId, activityIds, ...artifactData } = params;
        const design = await designStateService.addArtifact(designId, {
          ...artifactData,
          revisionRequired: artifactData.revisionRequired ?? false,
          outcomeIds: artifactData.outcomeIds ?? [],
        });

        // Link to activities if provided
        if (activityIds && activityIds.length > 0) {
          const artifact = design.artifacts[design.artifacts.length - 1];
          for (const actId of activityIds) {
            const act = design.activities.find(a => a.id === actId);
            if (act) {
              await designStateService.updateActivity(designId, actId, {
                artifactIds: [...act.artifactIds, artifact.id],
              });
            }
          }
        }

        const updated = await designStateService.get(designId);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: updated?.id,
              version: updated?.version,
              artifacts: updated?.artifacts,
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  // -------------------------------------------------------------------------
  // design_assessment
  // -------------------------------------------------------------------------
  server.tool(
    'design_assessment',
    'Create an assessment — the structured form learners or reviewers complete. Can be a submission form, peer review rubric, self-assessment, quiz, or checkpoint.',
    {
      designId: z.string().uuid(),
      name: z.string(),
      description: z.string().optional(),
      type: z.enum(['submission', 'peer_review', 'self_assessment', 'quiz', 'checkpoint']),
      isTeam: z.boolean().optional(),
      questions: z.array(z.object({
        text: z.string(),
        type: z.enum(['text', 'oneof', 'multiple', 'slider', 'file']),
        required: z.boolean().optional(),
        audience: z.enum(['submitter', 'reviewer', 'both']).optional(),
        choices: z.array(z.object({ id: z.string(), label: z.string(), weight: z.number().optional() })).optional(),
      })),
      outcomeIds: z.array(z.string()).optional(),
      artifactId: z.string().optional(),
      reviewConfig: z.object({
        numReviews: z.number().optional(),
        anonymized: z.boolean().optional(),
        requireResponse: z.boolean().optional(),
        calibrationExampleProvided: z.boolean().optional(),
        reviewerInstructions: z.string().optional(),
      }).optional(),
      activityIds: z.array(z.string()).optional().describe('Activities where this assessment appears'),
    },
    async (params) => {
      try {
        const { designId, activityIds, ...assessData } = params;

        const design = await designStateService.addAssessment(designId, {
          ...assessData,
          isTeam: assessData.isTeam ?? false,
          questions: assessData.questions.map(q => ({
            id: uuidv4(),
            text: q.text,
            type: q.type,
            required: q.required ?? true,
            audience: q.audience ?? 'submitter',
            choices: q.choices,
          })),
          outcomeIds: assessData.outcomeIds ?? [],
          reviewConfig: assessData.reviewConfig ? {
            numReviews: assessData.reviewConfig.numReviews ?? 2,
            anonymized: assessData.reviewConfig.anonymized ?? true,
            requireResponse: assessData.reviewConfig.requireResponse ?? true,
            calibrationExampleProvided: assessData.reviewConfig.calibrationExampleProvided ?? false,
            reviewerInstructions: assessData.reviewConfig.reviewerInstructions,
          } : undefined,
        });

        // Link to activities
        if (activityIds && activityIds.length > 0) {
          const assessment = design.assessments[design.assessments.length - 1];
          for (const actId of activityIds) {
            const act = design.activities.find(a => a.id === actId);
            if (act) {
              await designStateService.updateActivity(designId, actId, {
                assessmentIds: [...act.assessmentIds, assessment.id],
              });
            }
          }
        }

        const updated = await designStateService.get(designId);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: updated?.id,
              version: updated?.version,
              assessment: updated?.assessments[updated.assessments.length - 1],
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  // -------------------------------------------------------------------------
  // design_peer_review_cycle
  // -------------------------------------------------------------------------
  server.tool(
    'design_peer_review_cycle',
    'Configure a peer review workflow — who reviews whom, how many reviews, anonymity, calibration, and revision requirements.',
    {
      designId: z.string().uuid(),
      name: z.string(),
      submissionAssessmentId: z.string().describe('ID of the assessment learners submit'),
      reviewAssessmentId: z.string().optional().describe('ID of the assessment reviewers complete'),
      revisionEnabled: z.boolean().optional(),
      numReviewsPerSubmission: z.number().optional(),
      reviewerRole: z.enum(['peer', 'expert', 'self', 'mixed']).optional(),
      reviewAfterDeadline: z.boolean().optional(),
      revisionDeadlineDays: z.number().optional(),
    },
    async (params) => {
      try {
        const { designId, ...cycleData } = params;
        const design = await designStateService.addReviewCycle(designId, {
          ...cycleData,
          revisionEnabled: cycleData.revisionEnabled ?? true,
          numReviewsPerSubmission: cycleData.numReviewsPerSubmission ?? 2,
          reviewerRole: cycleData.reviewerRole ?? 'peer',
          reviewAfterDeadline: cycleData.reviewAfterDeadline ?? false,
        });
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: design.id,
              version: design.version,
              reviewCycles: design.reviewCycles,
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  // -------------------------------------------------------------------------
  // generate_rubric
  // -------------------------------------------------------------------------
  server.tool(
    'generate_rubric',
    'Add a rubric to the design. Rubrics provide structured evaluation criteria for assessments or artifacts, with multiple performance levels per criterion.',
    {
      designId: z.string().uuid(),
      name: z.string(),
      assessmentId: z.string().optional(),
      artifactId: z.string().optional(),
      criteria: z.array(z.object({
        name: z.string(),
        description: z.string(),
        outcomeId: z.string().optional(),
        weight: z.number().optional(),
        levels: z.array(z.object({
          label: z.string(),
          description: z.string(),
          score: z.number().optional(),
        })),
      })),
    },
    async (params) => {
      try {
        const { designId, ...rubricData } = params;
        const design = await designStateService.addRubric(designId, {
          ...rubricData,
          criteria: rubricData.criteria.map(c => ({
            id: uuidv4(),
            ...c,
            weight: c.weight ?? 1,
          })),
        });

        // If attached to assessment, update the assessment rubricId
        const rubric = design.rubrics[design.rubrics.length - 1];
        if (rubricData.assessmentId) {
          const assessment = design.assessments.find(a => a.id === rubricData.assessmentId);
          if (assessment) {
            await designStateService.updateActivity(designId, rubricData.assessmentId, {});
            // Note: assessment update not in state service yet — stored in rubric reference
          }
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: design.id,
              version: design.version,
              rubric,
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  // -------------------------------------------------------------------------
  // adjust_scaffolding
  // -------------------------------------------------------------------------
  server.tool(
    'adjust_scaffolding',
    'Change the scaffold level or BUILD loop phase for one or more activities. Use when the quality validator flags scaffold regression or when the educator wants to adjust the difficulty progression.',
    {
      designId: z.string().uuid(),
      changes: z.array(z.object({
        activityId: z.string().uuid(),
        scaffoldLevel: z.enum(['modelled', 'guided', 'supported', 'independent', 'transferred']).optional(),
        buildLoopPhase: z.enum(['brief', 'unpack', 'implement', 'learn', 'develop']).optional(),
        feedbackSource: z.enum(['peer', 'expert', 'self', 'automated', 'none']).optional(),
      })).describe('List of activity scaffold changes'),
    },
    async (params) => {
      try {
        let design = await designStateService.get(params.designId);
        if (!design) {
          return { content: [{ type: 'text' as const, text: `Design not found: ${params.designId}` }], isError: true };
        }

        for (const change of params.changes) {
          const { activityId, ...updates } = change;
          const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
          design = await designStateService.updateActivity(params.designId, activityId, filtered);
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: design.id,
              version: design.version,
              activities: design.activities.map(a => ({
                id: a.id,
                name: a.name,
                scaffoldLevel: a.scaffoldLevel,
                buildLoopPhase: a.buildLoopPhase,
              })),
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );

  // -------------------------------------------------------------------------
  // add_curveball
  // -------------------------------------------------------------------------
  server.tool(
    'add_curveball',
    'Inject a curveball — an unexpected constraint or change — into a specific activity. Curveballs test transfer and adaptation rather than mere completion.',
    {
      designId: z.string().uuid(),
      activityId: z.string().uuid().describe('Activity where the curveball is introduced'),
      description: z.string().describe('What changes or is introduced unexpectedly'),
      rationale: z.string().optional().describe('Why this curveball develops the intended capability'),
    },
    async (params) => {
      try {
        const design = await designStateService.updateActivity(params.designId, params.activityId, {
          curveballId: uuidv4(),
          instructions: `**Curveball: ${params.description}**\n\n${params.rationale ?? ''}`,
        });
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: design.id,
              version: design.version,
              activity: design.activities.find(a => a.id === params.activityId),
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
