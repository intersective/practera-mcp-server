import { z } from 'zod';
import { ScaffoldLevel } from './scaffold-levels.js';
import { BuildLoopPhase, ActivityKind } from './build-loop.js';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const AssumptionSchema = z.object({
  id: z.string(),
  text: z.string().describe('A stated assumption about audience, context, or resources'),
  category: z.enum(['audience', 'context', 'resources', 'technology', 'other']),
  confirmed: z.boolean().default(false),
});

export const LearningOutcomeSchema = z.object({
  id: z.string(),
  text: z.string().describe('What learners will be able to do'),
  level: z.string().optional().describe("Bloom's level or capability tier"),
  evidenceIds: z.array(z.string()).default([]).describe('IDs of artifacts/assessments that evidence this outcome'),
});

export const CapabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  currentLevel: z.string().optional().describe('Where learners start'),
  targetLevel: z.string().optional().describe('Where they should reach'),
});

export const AuthenticChallengeSchema = z.object({
  id: z.string(),
  title: z.string().describe('Brief title of the challenge'),
  scenario: z.string().describe('Rich description of the authentic context and goal'),
  audience: z.string().describe('Who the learner is creating for (end user / client)'),
  constraints: z.array(z.string()).default([]).describe('Real constraints learners must work within'),
  successCriteria: z.array(z.string()).default([]).describe('Observable signs the challenge is met'),
});

// ---------------------------------------------------------------------------
// Artifacts (deliverables)
// ---------------------------------------------------------------------------

export const ArtifactDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().describe('Name of the deliverable'),
  format: z.array(z.string()).describe('Accepted formats, e.g. ["Git repository", "PDF"]'),
  requiredEvidence: z.array(z.string()).describe('Specific evidence the artifact must contain'),
  reviewableBy: z.enum(['peer', 'expert', 'self', 'automated', 'none']),
  revisionRequired: z.boolean().default(false),
  outcomeIds: z.array(z.string()).default([]).describe('Learning outcomes this artifact evidences'),
});

// ---------------------------------------------------------------------------
// Rubric
// ---------------------------------------------------------------------------

export const RubricCriterionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  levels: z.array(z.object({
    label: z.string().describe('e.g. Excellent, Satisfactory, Needs work'),
    description: z.string(),
    score: z.number().optional(),
  })),
  outcomeId: z.string().optional().describe('Learning outcome this criterion measures'),
  weight: z.number().default(1),
});

export const RubricSchema = z.object({
  id: z.string(),
  name: z.string(),
  artifactId: z.string().optional().describe('Artifact this rubric evaluates'),
  assessmentId: z.string().optional().describe('Assessment this rubric belongs to'),
  criteria: z.array(RubricCriterionSchema),
});

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------

export const AssessmentQuestionDesignSchema = z.object({
  id: z.string(),
  text: z.string().describe('Question text'),
  type: z.enum(['text', 'oneof', 'multiple', 'slider', 'file']),
  required: z.boolean().default(true),
  audience: z.enum(['submitter', 'reviewer', 'both']),
  choices: z.array(z.object({
    id: z.string(),
    label: z.string(),
    weight: z.number().optional(),
  })).optional(),
  outcomeId: z.string().optional().describe('Outcome this question evidences'),
});

export const AssessmentDesignSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['submission', 'peer_review', 'self_assessment', 'quiz', 'checkpoint']),
  isTeam: z.boolean().default(false),
  questions: z.array(AssessmentQuestionDesignSchema),
  rubricId: z.string().optional(),
  outcomeIds: z.array(z.string()).default([]),
  artifactId: z.string().optional().describe('Artifact this assessment evaluates'),
  reviewConfig: z.object({
    numReviews: z.number().default(2),
    anonymized: z.boolean().default(true),
    requireResponse: z.boolean().default(true),
    calibrationExampleProvided: z.boolean().default(false),
    reviewerInstructions: z.string().optional(),
  }).optional(),
});

// ---------------------------------------------------------------------------
// Review cycles
// ---------------------------------------------------------------------------

export const ReviewCycleSchema = z.object({
  id: z.string(),
  name: z.string(),
  submissionAssessmentId: z.string().describe('Assessment learner submits'),
  reviewAssessmentId: z.string().optional().describe('Assessment used for peer review'),
  revisionEnabled: z.boolean().default(true),
  numReviewsPerSubmission: z.number().default(2),
  reviewerRole: z.enum(['peer', 'expert', 'self', 'mixed']),
  reviewAfterDeadline: z.boolean().default(false).describe('Whether review can occur after final deadline'),
  revisionDeadlineDays: z.number().optional().describe('Days after review to submit revision'),
});

// ---------------------------------------------------------------------------
// Activities and milestones
// ---------------------------------------------------------------------------

export const ActivityDesignSchema = z.object({
  id: z.string(),
  milestoneId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  scaffoldLevel: ScaffoldLevel,
  buildLoopPhase: BuildLoopPhase,
  kind: ActivityKind,
  estimatedMinutes: z.number().optional().describe('Override for workload estimation'),
  artifactIds: z.array(z.string()).default([]).describe('Artifacts produced in this activity'),
  assessmentIds: z.array(z.string()).default([]).describe('Assessments in this activity'),
  prerequisiteActivityIds: z.array(z.string()).default([]),
  order: z.number(),
  isTeam: z.boolean().default(false),
  feedbackSource: z.enum(['peer', 'expert', 'self', 'automated', 'none']).optional(),
  curveballId: z.string().optional().describe('Curveball that injects into this activity'),
});

export const MilestoneDesignSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  buildLoopPhase: BuildLoopPhase,
  order: z.number(),
  durationDays: z.number().optional(),
  unlockCondition: z.string().optional().describe('Condition to unlock this milestone'),
  activityIds: z.array(z.string()).default([]),
});

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

export const DependencySchema = z.object({
  id: z.string(),
  fromId: z.string().describe('Activity or milestone that must complete first'),
  toId: z.string().describe('Activity or milestone that depends on fromId'),
  type: z.enum(['prerequisite', 'unlock', 'feedback_trigger', 'revision_required']),
});

// ---------------------------------------------------------------------------
// Scaffold profile (aggregate view)
// ---------------------------------------------------------------------------

export const ScaffoldProfileSchema = z.object({
  startingLevel: ScaffoldLevel,
  endingLevel: ScaffoldLevel,
  progressionNotes: z.string().optional(),
  violations: z.array(z.string()).default([]).describe('Any detected scaffold regression warnings'),
});

// ---------------------------------------------------------------------------
// Design brief
// ---------------------------------------------------------------------------

export const DesignBriefSchema = z.object({
  concept: z.string().describe('Core concept or capability being developed'),
  audience: z.string().describe('Who the learners are'),
  startingLevel: z.string().describe('Where learners are now'),
  targetLevel: z.string().optional().describe('Where they should be after'),
  durationHours: z.number().describe('Total available time in hours'),
  desiredOutcome: z.string().describe('The transformation or capability you want to produce'),
  teamSize: z.number().optional().describe('Individuals (1) or team size'),
  deliveryMode: z.enum(['async', 'sync', 'blended']).optional(),
  availableTools: z.array(z.string()).optional(),
  accessToExperts: z.boolean().optional(),
  cohortSize: z.number().optional(),
  academicLevel: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  sourceMaterial: z.string().optional().describe('Existing content or resources to incorporate'),
  institutionalConfig: z.string().optional(),
  pedagogicalFramework: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Practera mapping (compiler output reference)
// ---------------------------------------------------------------------------

export const PracteraMappingSchema = z.object({
  experienceUuid: z.string().optional(),
  programUuid: z.string().optional(),
  projectUuid: z.string().optional(),
  milestoneIdMap: z.record(z.string(), z.string()).default({}),
  activityIdMap: z.record(z.string(), z.string()).default({}),
  assessmentIdMap: z.record(z.string(), z.string()).default({}),
  topicIdMap: z.record(z.string(), z.string()).default({}),
  compiledAt: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Quality report
// ---------------------------------------------------------------------------

export const QualityFindingSchema = z.object({
  rule: z.string().describe('Rule that produced this finding'),
  severity: z.enum(['critical', 'high', 'medium', 'info']),
  message: z.string().describe('Human-readable description of the issue'),
  affectedIds: z.array(z.string()).optional().describe('IDs of affected entities'),
  suggestion: z.string().optional().describe('How to fix this'),
});

export const QualityDimensionScoreSchema = z.object({
  dimension: z.string(),
  score: z.number().min(0).max(100),
  findings: z.array(QualityFindingSchema),
});

export const QualityReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  dimensions: z.array(QualityDimensionScoreSchema),
  allFindings: z.array(QualityFindingSchema),
  generatedAt: z.string(),
  passesMinimumThreshold: z.boolean().describe('True when no critical findings exist'),
});

// ---------------------------------------------------------------------------
// Top-level ExperienceDesign
// ---------------------------------------------------------------------------

export const ExperienceDesignSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),

  brief: DesignBriefSchema,
  assumptions: z.array(AssumptionSchema).default([]),
  outcomes: z.array(LearningOutcomeSchema).default([]),
  capabilities: z.array(CapabilitySchema).default([]),
  challenge: AuthenticChallengeSchema.optional(),

  milestones: z.array(MilestoneDesignSchema).default([]),
  activities: z.array(ActivityDesignSchema).default([]),
  artifacts: z.array(ArtifactDefinitionSchema).default([]),
  assessments: z.array(AssessmentDesignSchema).default([]),
  rubrics: z.array(RubricSchema).default([]),
  reviewCycles: z.array(ReviewCycleSchema).default([]),
  dependencies: z.array(DependencySchema).default([]),
  scaffoldProfile: ScaffoldProfileSchema.optional(),

  practeraMapping: PracteraMappingSchema.optional(),
  qualityReport: QualityReportSchema.optional(),
});

export type ExperienceDesign = z.infer<typeof ExperienceDesignSchema>;
export type DesignBrief = z.infer<typeof DesignBriefSchema>;
export type MilestoneDesign = z.infer<typeof MilestoneDesignSchema>;
export type ActivityDesign = z.infer<typeof ActivityDesignSchema>;
export type ArtifactDefinition = z.infer<typeof ArtifactDefinitionSchema>;
export type AssessmentDesign = z.infer<typeof AssessmentDesignSchema>;
export type AssessmentQuestionDesign = z.infer<typeof AssessmentQuestionDesignSchema>;
export type Rubric = z.infer<typeof RubricSchema>;
export type ReviewCycle = z.infer<typeof ReviewCycleSchema>;
export type LearningOutcome = z.infer<typeof LearningOutcomeSchema>;
export type Capability = z.infer<typeof CapabilitySchema>;
export type AuthenticChallenge = z.infer<typeof AuthenticChallengeSchema>;
export type QualityReport = z.infer<typeof QualityReportSchema>;
export type QualityFinding = z.infer<typeof QualityFindingSchema>;
export type QualityDimensionScore = z.infer<typeof QualityDimensionScoreSchema>;
export type Assumption = z.infer<typeof AssumptionSchema>;
export type Dependency = z.infer<typeof DependencySchema>;
export type ScaffoldProfile = z.infer<typeof ScaffoldProfileSchema>;
export type PracteraMapping = z.infer<typeof PracteraMappingSchema>;
