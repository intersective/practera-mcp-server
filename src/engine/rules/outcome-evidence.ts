import { ExperienceDesign } from '../schema/experience-design.js';
import { finding, RuleResult } from './types.js';

/** Every learning outcome must be evidenced by at least one artifact or assessment. */
export function outcomeEvidenceRule(design: ExperienceDesign): RuleResult {
  const findings = [];

  for (const outcome of design.outcomes) {
    const evidencedByArtifact = design.artifacts.some(a => a.outcomeIds.includes(outcome.id));
    const evidencedByAssessment = design.assessments.some(a => a.outcomeIds.includes(outcome.id));

    if (!evidencedByArtifact && !evidencedByAssessment) {
      findings.push(finding(
        'outcomeEvidence',
        'critical',
        `Outcome "${outcome.text}" has no artifact or assessment that evidences it. Learners cannot demonstrate this outcome.`,
        {
          affectedIds: [outcome.id],
          suggestion: 'Add an artifact or assessment that directly requires learners to demonstrate this outcome.',
        }
      ));
    }
  }

  if (design.outcomes.length === 0) {
    findings.push(finding(
      'outcomeEvidence',
      'high',
      'No learning outcomes have been defined. The experience has no measurable goals.',
      { suggestion: 'Define at least two learning outcomes using "Learners will be able to…" language.' }
    ));
  }

  return { findings };
}
