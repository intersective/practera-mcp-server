import { ExperienceDesign } from '../schema/experience-design.js';
import { finding, RuleResult } from './types.js';

/** Every assessment must map to at least one learning outcome. */
export function assessmentAlignmentRule(design: ExperienceDesign): RuleResult {
  const findings = [];
  const outcomeIds = new Set(design.outcomes.map(o => o.id));

  for (const assessment of design.assessments) {
    if (assessment.outcomeIds.length === 0) {
      findings.push(finding(
        'assessmentAlignment',
        'high',
        `Assessment "${assessment.name}" does not map to any learning outcome. Its purpose is unclear.`,
        {
          affectedIds: [assessment.id],
          suggestion: 'Link this assessment to at least one learning outcome it measures.',
        }
      ));
    } else {
      const missing = assessment.outcomeIds.filter(id => !outcomeIds.has(id));
      if (missing.length > 0) {
        findings.push(finding(
          'assessmentAlignment',
          'medium',
          `Assessment "${assessment.name}" references ${missing.length} outcome(s) that do not exist.`,
          { affectedIds: [assessment.id, ...missing] }
        ));
      }
    }

    // Peer review assessments should have rubrics
    if (assessment.type === 'peer_review' && !assessment.rubricId) {
      findings.push(finding(
        'assessmentAlignment',
        'high',
        `Peer review assessment "${assessment.name}" has no rubric. Reviewers will lack structured criteria.`,
        {
          affectedIds: [assessment.id],
          suggestion: 'Generate a rubric for this assessment using generate_rubric.',
        }
      ));
    }
  }

  return { findings };
}
