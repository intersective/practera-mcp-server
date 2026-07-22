import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { v4 as uuidv4 } from 'uuid';
import { designStateService } from '../../engine/state/design-state-service.js';
import type {
  MilestoneDesign,
  ActivityDesign,
  ArtifactDefinition,
  AssessmentDesign,
  ReviewCycle,
  LearningOutcome,
  Capability,
  AuthenticChallenge,
  Dependency,
} from '../../engine/schema/experience-design.js';

export function registerArchitectureTools(server: McpServer) {
  server.tool(
    'design_experience_architecture',
    'Use this when you have a brief and capabilities and want to generate the full milestone/activity architecture. This is the main design composition tool — provide a complete structured architecture derived from the BUILD loop (Brief→Unpack→Implement→Learn→Develop). All milestones, activities, artifacts, assessments, outcomes, and review cycles should be provided in a single call.',
    {
      designId: z.string().uuid(),
      challenge: z.object({
        title: z.string(),
        scenario: z.string(),
        audience: z.string(),
        constraints: z.array(z.string()),
        successCriteria: z.array(z.string()),
      }).optional().describe('Authentic challenge (overwrites any existing challenge)'),
      outcomes: z.array(z.object({
        text: z.string(),
        level: z.string().optional(),
      })).optional().describe('Learning outcomes (overwrites existing)'),
      capabilities: z.array(z.object({
        name: z.string(),
        description: z.string(),
        currentLevel: z.string().optional(),
        targetLevel: z.string().optional(),
      })).optional().describe('Capabilities (overwrites existing)'),
      milestones: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
        buildLoopPhase: z.enum(['brief', 'unpack', 'implement', 'learn', 'develop']),
        order: z.number(),
        durationDays: z.number().optional(),
      })),
      activities: z.array(z.object({
        milestoneName: z.string().describe('Name of parent milestone (used to link activities to milestones)'),
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
        artifactNames: z.array(z.string()).optional().describe('Names of artifacts produced in this activity'),
        assessmentNames: z.array(z.string()).optional().describe('Names of assessments in this activity'),
        prerequisiteActivityNames: z.array(z.string()).optional(),
      })),
      artifacts: z.array(z.object({
        name: z.string(),
        format: z.array(z.string()),
        requiredEvidence: z.array(z.string()),
        reviewableBy: z.enum(['peer', 'expert', 'self', 'automated', 'none']),
        revisionRequired: z.boolean().optional(),
        outcomeTexts: z.array(z.string()).optional().describe('Text of outcomes this artifact evidences'),
      })).optional(),
      assessments: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
        type: z.enum(['submission', 'peer_review', 'self_assessment', 'quiz', 'checkpoint']),
        isTeam: z.boolean().optional(),
        outcomeTexts: z.array(z.string()).optional(),
        artifactName: z.string().optional(),
        questions: z.array(z.object({
          text: z.string(),
          type: z.enum(['text', 'oneof', 'multiple', 'slider', 'file']),
          required: z.boolean().optional(),
          audience: z.enum(['submitter', 'reviewer', 'both']).optional(),
          choices: z.array(z.object({ id: z.string(), label: z.string(), weight: z.number().optional() })).optional(),
        })),
        reviewConfig: z.object({
          numReviews: z.number().optional(),
          anonymized: z.boolean().optional(),
          requireResponse: z.boolean().optional(),
          calibrationExampleProvided: z.boolean().optional(),
          reviewerInstructions: z.string().optional(),
        }).optional(),
      })).optional(),
      reviewCycles: z.array(z.object({
        name: z.string(),
        submissionAssessmentName: z.string(),
        reviewAssessmentName: z.string().optional(),
        revisionEnabled: z.boolean().optional(),
        numReviewsPerSubmission: z.number().optional(),
        reviewerRole: z.enum(['peer', 'expert', 'self', 'mixed']).optional(),
      })).optional(),
    },
    async (params) => {
      try {
        const design = await designStateService.get(params.designId);
        if (!design) {
          return { content: [{ type: 'text' as const, text: `Design not found: ${params.designId}` }], isError: true };
        }

        // Build challenge
        const challenge: AuthenticChallenge | undefined = params.challenge
          ? { ...params.challenge, id: uuidv4() }
          : design.challenge;

        // Build outcomes
        const outcomes: LearningOutcome[] = (params.outcomes ?? design.outcomes).map(o => ({
          id: uuidv4(),
          text: o.text,
          level: o.level,
          evidenceIds: [],
        }));

        // Build capabilities
        const capabilities: Capability[] = (params.capabilities ?? design.capabilities).map(c => ({
          id: uuidv4(),
          ...c,
        }));

        // Build milestones
        const milestones: MilestoneDesign[] = params.milestones.map(ms => ({
          id: uuidv4(),
          name: ms.name,
          description: ms.description,
          buildLoopPhase: ms.buildLoopPhase,
          order: ms.order,
          durationDays: ms.durationDays,
          activityIds: [],
        }));

        const milestoneByName = new Map(milestones.map(m => [m.name, m]));

        // Build artifacts
        const artifactsByName = new Map<string, ArtifactDefinition>();
        for (const art of (params.artifacts ?? [])) {
          const outcomeIds = (art.outcomeTexts ?? [])
            .map(t => outcomes.find(o => o.text === t)?.id)
            .filter(Boolean) as string[];
          const artifact: ArtifactDefinition = {
            id: uuidv4(),
            name: art.name,
            format: art.format,
            requiredEvidence: art.requiredEvidence,
            reviewableBy: art.reviewableBy,
            revisionRequired: art.revisionRequired ?? false,
            outcomeIds,
          };
          artifactsByName.set(art.name, artifact);
        }

        // Build assessments
        const assessmentsByName = new Map<string, AssessmentDesign>();
        for (const a of (params.assessments ?? [])) {
          const outcomeIds = (a.outcomeTexts ?? [])
            .map(t => outcomes.find(o => o.text === t)?.id)
            .filter(Boolean) as string[];
          const artifactId = a.artifactName ? artifactsByName.get(a.artifactName)?.id : undefined;
          const assessment: AssessmentDesign = {
            id: uuidv4(),
            name: a.name,
            description: a.description,
            type: a.type,
            isTeam: a.isTeam ?? false,
            questions: a.questions.map(q => ({
              id: uuidv4(),
              text: q.text,
              type: q.type,
              required: q.required ?? true,
              audience: q.audience ?? 'submitter',
              choices: q.choices,
            })),
            outcomeIds,
            artifactId,
            reviewConfig: a.reviewConfig ? {
              numReviews: a.reviewConfig.numReviews ?? 2,
              anonymized: a.reviewConfig.anonymized ?? true,
              requireResponse: a.reviewConfig.requireResponse ?? true,
              calibrationExampleProvided: a.reviewConfig.calibrationExampleProvided ?? false,
              reviewerInstructions: a.reviewConfig.reviewerInstructions,
            } : undefined,
          };
          assessmentsByName.set(a.name, assessment);
        }

        // Build activities (resolve names -> IDs)
        const activityByName = new Map<string, ActivityDesign>();
        const activities: ActivityDesign[] = [];

        for (const act of params.activities) {
          const milestone = milestoneByName.get(act.milestoneName);
          if (!milestone) {
            return {
              content: [{ type: 'text' as const, text: `Activity "${act.name}" references unknown milestone "${act.milestoneName}"` }],
              isError: true,
            };
          }

          const artifactIds = (act.artifactNames ?? [])
            .map(n => artifactsByName.get(n)?.id)
            .filter(Boolean) as string[];
          const assessmentIds = (act.assessmentNames ?? [])
            .map(n => assessmentsByName.get(n)?.id)
            .filter(Boolean) as string[];

          const activity: ActivityDesign = {
            id: uuidv4(),
            milestoneId: milestone.id,
            name: act.name,
            description: act.description,
            instructions: act.instructions,
            scaffoldLevel: act.scaffoldLevel,
            buildLoopPhase: act.buildLoopPhase,
            kind: act.kind,
            order: act.order,
            isTeam: act.isTeam ?? false,
            feedbackSource: act.feedbackSource,
            estimatedMinutes: act.estimatedMinutes,
            artifactIds,
            assessmentIds,
            prerequisiteActivityIds: [],
          };

          activities.push(activity);
          activityByName.set(act.name, activity);
          milestone.activityIds.push(activity.id);
        }

        // Resolve prerequisite names -> IDs
        for (let i = 0; i < params.activities.length; i++) {
          const prereqNames = params.activities[i].prerequisiteActivityNames ?? [];
          const prereqIds = prereqNames
            .map(n => activityByName.get(n)?.id)
            .filter(Boolean) as string[];
          activities[i] = { ...activities[i], prerequisiteActivityIds: prereqIds };
        }

        // Link outcome evidence IDs from artifacts
        const finalOutcomes = outcomes.map(o => {
          const evidencedByArtifacts = Array.from(artifactsByName.values())
            .filter(a => a.outcomeIds.includes(o.id))
            .map(a => a.id);
          const evidencedByAssessments = Array.from(assessmentsByName.values())
            .filter(a => a.outcomeIds.includes(o.id))
            .map(a => a.id);
          return { ...o, evidenceIds: [...evidencedByArtifacts, ...evidencedByAssessments] };
        });

        // Build review cycles
        const reviewCycles: ReviewCycle[] = (params.reviewCycles ?? []).map(rc => ({
          id: uuidv4(),
          name: rc.name,
          submissionAssessmentId: assessmentsByName.get(rc.submissionAssessmentName)?.id ?? '',
          reviewAssessmentId: rc.reviewAssessmentName ? assessmentsByName.get(rc.reviewAssessmentName)?.id : undefined,
          revisionEnabled: rc.revisionEnabled ?? true,
          numReviewsPerSubmission: rc.numReviewsPerSubmission ?? 2,
          reviewerRole: rc.reviewerRole ?? 'peer',
          reviewAfterDeadline: false,
        }));

        // Build dependency list from prerequisite links
        const dependencies: Dependency[] = [];
        for (const activity of activities) {
          for (const prereqId of activity.prerequisiteActivityIds) {
            dependencies.push({
              id: uuidv4(),
              fromId: prereqId,
              toId: activity.id,
              type: 'prerequisite',
            });
          }
        }

        const updated = await designStateService.replaceArchitecture(params.designId, {
          challenge,
          outcomes: finalOutcomes,
          capabilities,
          milestones,
          activities,
          artifacts: Array.from(artifactsByName.values()),
          assessments: Array.from(assessmentsByName.values()),
          rubrics: design.rubrics,
          reviewCycles,
          dependencies,
        });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              designId: updated.id,
              version: updated.version,
              summary: {
                milestones: updated.milestones.length,
                activities: updated.activities.length,
                artifacts: updated.artifacts.length,
                assessments: updated.assessments.length,
                outcomes: updated.outcomes.length,
                capabilities: updated.capabilities.length,
                reviewCycles: updated.reviewCycles.length,
              },
              message: 'Architecture generated. Run validate_alignment to check quality, or render_experience_map to visualize.',
            }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    }
  );
}
