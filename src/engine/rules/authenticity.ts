import { ExperienceDesign } from '../schema/experience-design.js';
import { finding, RuleResult } from './types.js';

/**
 * The work must resemble meaningful practice — not contrived exercises.
 * Checks for presence of an authentic challenge, real constraints, and observable success criteria.
 */
export function authenticityRule(design: ExperienceDesign): RuleResult {
  const findings = [];

  if (!design.challenge) {
    findings.push(finding(
      'authenticity',
      'critical',
      'No authentic challenge has been defined. The experience lacks a real-world purpose.',
      { suggestion: 'Use design_experience_architecture or create_design_brief to define an authentic scenario.' }
    ));
    return { findings };
  }

  if ((design.challenge.constraints ?? []).length === 0) {
    findings.push(finding(
      'authenticity',
      'medium',
      'The authentic challenge has no constraints. Real work involves trade-offs; constraints make challenges meaningful.',
      {
        affectedIds: [design.challenge.id],
        suggestion: 'Add 2–3 real constraints (time, budget, audience needs, technical limits).',
      }
    ));
  }

  if ((design.challenge.successCriteria ?? []).length === 0) {
    findings.push(finding(
      'authenticity',
      'high',
      'The challenge has no success criteria. Learners and assessors cannot agree on what "good" looks like.',
      {
        affectedIds: [design.challenge.id],
        suggestion: 'Define observable success criteria: what would a real client or audience accept?',
      }
    ));
  }

  // Content-only activities (all reading, no production) signal a non-authentic design
  const implementActivities = design.activities.filter(a =>
    a.buildLoopPhase === 'implement' || a.kind === 'independent_task' || a.kind === 'guided_task'
  );

  if (design.activities.length > 0 && implementActivities.length === 0) {
    findings.push(finding(
      'authenticity',
      'high',
      'No production activities exist — all activities appear to be reading or passive content. Authentic learning requires learners to make and create.',
      { suggestion: 'Add activities where learners produce artifacts, make decisions, or solve real problems.' }
    ));
  }

  return { findings };
}
