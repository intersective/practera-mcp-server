import { ExperienceDesign, QualityReport, QualityDimensionScore } from '../schema/experience-design.js';
import { outcomeEvidenceRule } from './outcome-evidence.js';
import { assessmentAlignmentRule } from './assessment-alignment.js';
import { artifactCoverageRule } from './artifact-coverage.js';
import { feedbackTimingRule } from './feedback-timing.js';
import { peerReviewQualityRule } from './peer-review-quality.js';
import { scaffoldProgressionRule } from './scaffold-progression.js';
import { workloadFitRule } from './workload-fit.js';
import { collaborationStructureRule } from './collaboration-structure.js';
import { prerequisiteOrderingRule } from './prerequisite-ordering.js';
import { attemptFeedbackRevisionRule } from './attempt-feedback-revision.js';
import { processRewardRule } from './process-reward.js';
import { aiResilienceRule } from './ai-resilience.js';
import { authenticityRule } from './authenticity.js';
import type { Rule } from './types.js';

export type { Rule };
export { outcomeEvidenceRule, assessmentAlignmentRule, artifactCoverageRule,
  feedbackTimingRule, peerReviewQualityRule, scaffoldProgressionRule,
  workloadFitRule, collaborationStructureRule, prerequisiteOrderingRule,
  attemptFeedbackRevisionRule, processRewardRule, aiResilienceRule, authenticityRule };

/**
 * Eight quality dimensions and the rules that feed them.
 * Score formula: start at 100; subtract per finding severity.
 */
const DIMENSION_RULES: Array<{
  dimension: string;
  coreQuestion: string;
  rules: Rule[];
}> = [
  {
    dimension: 'Authenticity',
    coreQuestion: 'Does the work resemble meaningful practice?',
    rules: [authenticityRule],
  },
  {
    dimension: 'Alignment',
    coreQuestion: 'Do outcomes, tasks, evidence and criteria agree?',
    rules: [outcomeEvidenceRule, assessmentAlignmentRule, artifactCoverageRule],
  },
  {
    dimension: 'Scaffolding',
    coreQuestion: 'Does support match readiness and fade appropriately?',
    rules: [scaffoldProgressionRule],
  },
  {
    dimension: 'Activity',
    coreQuestion: 'Are learners making decisions and producing things?',
    rules: [processRewardRule],
  },
  {
    dimension: 'Feedback',
    coreQuestion: 'Does useful feedback arrive before final submission?',
    rules: [feedbackTimingRule, peerReviewQualityRule],
  },
  {
    dimension: 'Iteration',
    coreQuestion: 'Must learners act on evidence and improve?',
    rules: [attemptFeedbackRevisionRule],
  },
  {
    dimension: 'Social Learning',
    coreQuestion: 'Is peer/team interaction structurally meaningful?',
    rules: [collaborationStructureRule, prerequisiteOrderingRule],
  },
  {
    dimension: 'Feasibility',
    coreQuestion: 'Can the experience actually be completed as configured?',
    rules: [workloadFitRule, aiResilienceRule],
  },
];

const SEVERITY_DEDUCTION: Record<string, number> = {
  critical: 30,
  high: 15,
  medium: 7,
  info: 0,
};

/**
 * Run all rules and produce a structured quality report.
 */
export function runQualityCheck(design: ExperienceDesign): QualityReport {
  const dimensions: QualityDimensionScore[] = [];

  for (const dimConfig of DIMENSION_RULES) {
    const allFindings = dimConfig.rules.flatMap(rule => rule(design).findings);
    const deduction = allFindings.reduce((sum, f) => sum + (SEVERITY_DEDUCTION[f.severity] ?? 0), 0);
    const score = Math.max(0, 100 - deduction);

    dimensions.push({
      dimension: dimConfig.dimension,
      score,
      findings: allFindings,
    });
  }

  const allFindings = dimensions.flatMap(d => d.findings);
  const overallScore = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);
  const passesMinimumThreshold = !allFindings.some(f => f.severity === 'critical');

  return {
    overallScore,
    dimensions,
    allFindings: allFindings.sort((a, b) => {
      const order = ['critical', 'high', 'medium', 'info'];
      return order.indexOf(a.severity) - order.indexOf(b.severity);
    }),
    generatedAt: new Date().toISOString(),
    passesMinimumThreshold,
  };
}
